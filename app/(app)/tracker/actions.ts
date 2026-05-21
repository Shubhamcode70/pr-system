"use server";
import { supabaseServer } from "@/lib/supabase/server";

function sv(v: any): string {
  const s = (v ?? "").toString().trim();
  return ["nan", "NaT", "None", "0", "0.0", ""].includes(s) ? "" : s;
}
function fmtDate(v: any): string {
  if (!v) return "";
  const s = String(v);
  if (s.length === 10 && s[4] === "-") {
    const d = new Date(s);
    if (!isNaN(d.valueOf())) return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  return s;
}

export async function searchPR(prNumber: string): Promise<
  { error: string } |
  {
    status: string; status_class: "approved" | "pending" | "inprogress";
    summary: Record<string, string>;
    approval_chain: any[];
    items: any[];
    item_cols: string[];
    total_items: number;
    has_matrix: boolean;
  }
> {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  // Active batch
  const { data: batch } = await supabase
    .from("sap_import_batches").select("id").eq("status", "active")
    .order("uploaded_at", { ascending: false }).limit(1).maybeSingle();
  if (!batch) return { error: "No SAP data loaded. Ask an admin to upload the Excel." };

  // Pending rows for this PR (multiple line items => multiple rows)
  const { data: pendingRows } = await supabase
    .from("sap_pr_pending").select("*").eq("batch_id", batch.id).eq("pr_no", prNumber);
  if (!pendingRows || pendingRows.length === 0) return { error: `PR ${prNumber} not found` };
  const first = pendingRows[0] as any;
  const rawFirst = first.raw_row as Record<string, any>;

  // Cost-centre row
  const { data: ccRow } = await supabase
    .from("sap_pr_cost_centre").select("*").eq("batch_id", batch.id).eq("pr_no", prNumber).maybeSingle();
  const ccCode = ccRow?.cost_centre || "";

  // Approval matrix
  let matrixEntry: any = null;
  if (ccCode) {
    const { data: mx } = await supabase.from("sap_approval_matrix")
      .select("*").eq("batch_id", batch.id).eq("cost_centre", ccCode).maybeSingle();
    matrixEntry = mx;
  }
  const matrixLevels = (matrixEntry?.levels as Record<string, any>) || {};

  // Build approval chain from positional Release Authority / Release Date columns in raw_row
  const headerKeys = Object.keys(rawFirst);
  const authCols = headerKeys.filter(k => k.toLowerCase().includes("release authority"));
  const dateCols = headerKeys.filter(k => (k.toLowerCase().includes("release date") || k.toLowerCase().includes("release  date")) && !k.toLowerCase().includes("final"));

  const matrixLevelList = ["A","B","C","D","E","F","G","H","I"]
    .map(k => matrixLevels[k]).filter(Boolean);

  const approvalChain: any[] = [];
  const ord = ["1st","2nd","3rd","4th","5th","6th","7th","8th","9th"];
  for (let i = 0; i < Math.min(authCols.length, dateCols.length); i++) {
    const sap = sv(rawFirst[authCols[i]]);
    const date = fmtDate(rawFirst[dateCols[i]]);
    const done = !!sv(rawFirst[dateCols[i]]);
    const ml = matrixLevelList[i];
    const level_label = ml ? ml.level : (ord[i] || String(i + 1));
    const name = ml ? (ml.name || sap) : sap;
    const designation = ml ? ml.designation : `Level ${i + 1} Approver`;
    if (!name && !date) continue;
    approvalChain.push({
      level: level_label, designation, name, sap: ml?.sap || sap,
      emp_id: ml?.emp_id || "", date, done
    });
  }
  // Final
  const finalDate = first.final_release_date ? fmtDate(first.final_release_date) : "";
  approvalChain.push({
    level: "Final", designation: "Final Release",
    name: "All Approvers", sap: "", emp_id: "", date: finalDate, done: !!finalDate
  });

  const doneCount = approvalChain.filter(a => a.done).length;
  const total = approvalChain.length;
  let status: string, statusClass: "approved" | "pending" | "inprogress";
  if (finalDate) { status = "Fully Approved"; statusClass = "approved"; }
  else if (doneCount === 0) {
    const fa = approvalChain.find(a => a.name && a.name !== "All Approvers");
    status = `Pending — Awaiting: ${fa?.designation || "Level 1"}`;
    statusClass = "pending";
  } else {
    const np = approvalChain.find(a => !a.done);
    status = `In Progress — Pending at: ${np?.designation || "?"}`;
    if (np?.name && np.name !== "All Approvers") status += ` (${np.name})`;
    status += `  [${doneCount}/${total} done]`;
    statusClass = "inprogress";
  }

  // Line items — extract from raw_row across all pendingRows
  const showCols = ["Item no", "Short Text", "Qty.", "Unit", "Valuation Price", "Account Assignment", "Material Code", "Purchase group"];
  const availCols: string[] = [];
  for (const c of showCols) if (c in rawFirst) availCols.push(c);
  const items = pendingRows.map((r: any) => {
    const o: Record<string, string> = {};
    for (const c of availCols) o[c] = sv(r.raw_row?.[c]);
    return o;
  });

  return {
    status, status_class: statusClass,
    summary: {
      pr_number: prNumber,
      plant: first.plant || "",
      username: first.username || "",
      requester: first.requisitioner || "",
      total_value: first.total_pr_value || "",
      uom: first.uom || "",
      req_date: fmtDate(first.request_date),
      final_date: finalDate,
      cost_center: ccCode,
      purch_group: ccRow?.purchasing_group_desc || "",
      po_number: ccRow?.po_number || "",
      po_date: fmtDate(ccRow?.po_date),
      cc_desc: matrixEntry?.description || "",
      business: matrixEntry?.business || "",
      location: matrixEntry?.location || "",
      function: matrixEntry?.function || "",
      person_resp: matrixEntry?.person || ""
    },
    approval_chain: approvalChain,
    items, item_cols: availCols, total_items: items.length,
    has_matrix: !!matrixEntry
  };
}
