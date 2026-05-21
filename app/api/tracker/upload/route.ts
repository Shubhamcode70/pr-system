import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// SAP approval matrix column positions (0-based) — match the Python tracker:
// (level, designation, col_emp, col_name, col_sap)
const MATRIX_LEVELS: Array<[string, string, number, number, number]> = [
  ["A", "Cost Center Head",                7,  8, 10],
  ["B", "Plant / Central Controller",     11, 12, 13],
  ["C", "Indirect / Plant Purchase Head", 14, 15, 16],
  ["D", "Func. Head (-1L)",               17, 18, 19],
  ["E", "Corporate Controller",           20, 21, 22],
  ["F", "Corporate Purchase Head",        23, 24, 25],
  ["G", "Functional Head",                26, 27, 28],
  ["H", "CFO",                            29, 30, 31],
  ["I", "Managing Director",              32, 33, 34],
];

function sv(v: any): string {
  const s = (v ?? "").toString().trim();
  return ["nan", "NaT", "None", "0", "0.0", ""].includes(s) ? "" : s;
}
function parseDate(v: any): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const d = new Date(v);
  if (!isNaN(d.valueOf())) return d.toISOString().slice(0, 10);
  return null;
}

export async function POST(req: Request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const { data: me } = await supabase.from("app_users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) return NextResponse.json({ error: "admins only" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });
  if (file.size > 50 * 1024 * 1024) return NextResponse.json({ error: "file too large (>50MB)" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const wb = new ExcelJS.Workbook();
  try { await wb.xlsx.load(buf as any); } catch (e: any) { return NextResponse.json({ error: `Excel parse failed: ${e.message}` }, { status: 400 }); }

  const pending = wb.getWorksheet("PR where pending");
  const costCtr = wb.getWorksheet("PR Cost Center");
  const matrix  = wb.getWorksheet("Approval Matrix");
  if (!pending || !costCtr || !matrix) {
    return NextResponse.json({ error: "Excel must contain sheets: 'PR where pending', 'PR Cost Center', 'Approval Matrix'" }, { status: 400 });
  }

  const sb = supabaseAdmin();

  // Mark previous batches as superseded
  await sb.from("sap_import_batches").update({ status: "superseded" }).eq("status", "active");

  // Create new batch
  const { data: batch, error: bErr } = await sb.from("sap_import_batches").insert({
    filename: file.name, uploaded_by: user.id, status: "active"
  }).select("id").single();
  if (bErr || !batch) return NextResponse.json({ error: bErr?.message || "batch create failed" }, { status: 500 });
  const batchId = batch.id;

  // --- Parse "PR where pending" ---
  const pendingHeader: string[] = (pending.getRow(1).values as any[]).slice(1).map(v => sv(v));
  const findCol = (needle: string) => pendingHeader.findIndex(h => h.toLowerCase().includes(needle.toLowerCase()));
  const colPrNo = findCol("PR No");
  const colPlant = findCol("Plant");
  const colUser = findCol("Username");
  const colReq = findCol("Name of requisitioner");
  const colTotal = findCol("Total PR value");
  const colUom = findCol("UOM");
  const colReqDate = findCol("Request Date");
  const colFinal = pendingHeader.findIndex(h => h.toLowerCase().includes("final"));

  const pendingRows: any[] = [];
  pending.eachRow({ includeEmpty: false }, (row, idx) => {
    if (idx === 1) return;
    const arr: any[] = (row.values as any[]).slice(1);
    const rawObj: Record<string, any> = {};
    pendingHeader.forEach((h, i) => { rawObj[h] = arr[i] ?? null; });
    const pr_no = sv(arr[colPrNo]);
    if (!pr_no) return;
    pendingRows.push({
      batch_id: batchId, pr_no, raw_row: rawObj,
      plant: colPlant >= 0 ? sv(arr[colPlant]) : null,
      username: colUser >= 0 ? sv(arr[colUser]) : null,
      requisitioner: colReq >= 0 ? sv(arr[colReq]) : null,
      total_pr_value: colTotal >= 0 ? sv(arr[colTotal]) : null,
      uom: colUom >= 0 ? sv(arr[colUom]) : null,
      request_date: colReqDate >= 0 ? parseDate(arr[colReqDate]) : null,
      final_release_date: colFinal >= 0 ? parseDate(arr[colFinal]) : null
    });
  });

  // --- Parse "PR Cost Center" ---
  const ccHeader: string[] = (costCtr.getRow(1).values as any[]).slice(1).map(v => sv(v));
  const ccColPr = ccHeader.findIndex(h => h.toLowerCase().includes("purchase requisition"));
  const ccColCenter = ccHeader.findIndex(h => h.toLowerCase().includes("cost center"));
  const ccColPGr = ccHeader.findIndex(h => h.toLowerCase().includes("purchasing group description"));
  const ccColPo = ccHeader.findIndex(h => h.toLowerCase().includes("purchase order") && !h.toLowerCase().includes("date"));
  const ccColPoDate = ccHeader.findIndex(h => h.toLowerCase().includes("purchase order date"));

  const ccRows: any[] = [];
  costCtr.eachRow({ includeEmpty: false }, (row, idx) => {
    if (idx === 1) return;
    const arr: any[] = (row.values as any[]).slice(1);
    const rawObj: Record<string, any> = {};
    ccHeader.forEach((h, i) => { rawObj[h] = arr[i] ?? null; });
    const pr_no = ccColPr >= 0 ? sv(arr[ccColPr]) : "";
    if (!pr_no) return;
    ccRows.push({
      batch_id: batchId, pr_no, raw_row: rawObj,
      cost_centre: ccColCenter >= 0 ? sv(arr[ccColCenter]).replace(/\.0$/, "") : null,
      purchasing_group_desc: ccColPGr >= 0 ? sv(arr[ccColPGr]) : null,
      po_number: ccColPo >= 0 ? sv(arr[ccColPo]) : null,
      po_date: ccColPoDate >= 0 ? parseDate(arr[ccColPoDate]) : null
    });
  });

  // --- Parse "Approval Matrix" (no header) ---
  const matrixRows: any[] = [];
  matrix.eachRow({ includeEmpty: false }, (row) => {
    const arr: any[] = (row.values as any[]).slice(1);
    const ccRaw = sv(arr[0]);
    if (!ccRaw) return;
    let cc = ccRaw.replace(/\.0$/, "");
    if (!/^\d+$/.test(cc)) return;
    const levels: Record<string, any> = {};
    for (const [lvl, desig, ce, cn, cs] of MATRIX_LEVELS) {
      const emp = sv(arr[ce]); const name = sv(arr[cn]); const sap = sv(arr[cs]);
      if (sap || name) levels[lvl] = { level: lvl, designation: desig, emp_id: emp, name: name || sap, sap };
    }
    matrixRows.push({
      batch_id: batchId, cost_centre: cc,
      description: sv(arr[1]), business: sv(arr[2]), location: sv(arr[3]),
      function: sv(arr[4]), person: sv(arr[5]), levels
    });
  });

  // Bulk insert (in chunks to stay under request limits)
  async function chunkInsert(table: string, rows: any[]) {
    const size = 500;
    for (let i = 0; i < rows.length; i += size) {
      const { error } = await sb.from(table).insert(rows.slice(i, i + size));
      if (error) throw new Error(`${table}: ${error.message}`);
    }
  }
  try {
    if (pendingRows.length) await chunkInsert("sap_pr_pending", pendingRows);
    if (ccRows.length) await chunkInsert("sap_pr_cost_centre", ccRows);
    if (matrixRows.length) await chunkInsert("sap_approval_matrix", matrixRows);
  } catch (e: any) {
    await sb.from("sap_import_batches").delete().eq("id", batchId);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  await sb.from("sap_import_batches").update({
    row_counts: { pending: pendingRows.length, cost_centre: ccRows.length, matrix: matrixRows.length }
  }).eq("id", batchId);

  return NextResponse.json({
    ok: true, batchId,
    counts: { pending: pendingRows.length, cost_centre: ccRows.length, matrix: matrixRows.length }
  });
}
