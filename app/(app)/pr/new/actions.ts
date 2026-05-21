"use server";
import { supabaseServer } from "@/lib/supabase/server";
import { sendEmail, emailTemplate } from "@/lib/email";

export async function createPR(input: {
  header: any;
  lines: any[];
  action: "draft" | "submit";
}): Promise<{ id: string } | { error: string }> {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const h = input.header;
  const lines = (input.lines || []).map((l, i) => ({ ...l, item_no: i + 1 }));
  if (lines.length === 0) return { error: "Add at least one line item" };
  if (lines.length > 100) return { error: "Max 100 line items" };

  // Server-side validation mirrors client validation as a defence in depth
  if (input.action === "submit") {
    const missing = (n: number, k: string, v: any) => (v === null || v === undefined || v === "" || (typeof v === "string" && !v.trim())) ? `Line ${n}: ${k} is required` : null;
    const lineErrors: string[] = [];
    lines.forEach((l: any, i) => {
      const n = i + 1;
      for (const k of ["short_text","uom","delivery_date","material_group","plant_code","purchasing_group","requisitioner_name","cost_centre","gl_account","cost_bearer"]) {
        const m = missing(n, k, l[k]); if (m) lineErrors.push(m);
      }
      if (!l.quantity || Number(l.quantity) <= 0) lineErrors.push(`Line ${n}: quantity must be > 0`);
      if (l.valuation_price === undefined || l.valuation_price === null || Number(l.valuation_price) < 0) lineErrors.push(`Line ${n}: valuation_price must be >= 0`);
    });
    if (lineErrors.length > 0) return { error: lineErrors.slice(0, 5).join("; ") + (lineErrors.length > 5 ? ` ... and ${lineErrors.length - 5} more` : "") };
  }

  // Insert PR (draft first)
  const prRow: any = {
    requester_id: user.id,
    requirement_received_from: h.requirement_received_from,
    department: h.department,
    location: h.location,
    purpose_of_procurement: h.purpose_of_procurement,
    pr_type: h.pr_type,
    cr_id: h.pr_type === "CAPEX" ? (h.cr_id || null) : null,
    asset_number: h.pr_type === "CAPEX" ? (h.asset_number || null) : null,
    single_vendor_flag: !!h.single_vendor_flag,
    single_vendor_justification: h.single_vendor_flag ? (h.single_vendor_justification || null) : null,
    preferred_vendor_name: h.preferred_vendor_name || null,
    status: "draft"
  };

  const { data: pr, error } = await supabase.from("purchase_requests").insert(prRow).select("id, pr_number").single();
  if (error || !pr) {
    const msg = error?.message || "Failed to create PR";
    if (msg.toLowerCase().includes("infinite recursion")) return { error: "Server permission error (RLS). Refresh and try again." };
    return { error: msg };
  }

  // Insert lines
  const linesPayload = lines.map(l => ({
    pr_id: pr.id,
    item_no: l.item_no,
    short_text: l.short_text,
    uom: l.uom,
    quantity: Number(l.quantity),
    valuation_price: Number(l.valuation_price),
    delivery_date: l.delivery_date,
    material_group: l.material_group,
    plant_code: l.plant_code,
    purchasing_group: l.purchasing_group,
    requisitioner_name: l.requisitioner_name,
    acct_assignment_qty: Number(l.acct_assignment_qty),
    cost_centre: l.cost_centre,
    gl_account: l.gl_account,
    cost_bearer: l.cost_bearer
  }));
  const { error: lineErr } = await supabase.from("pr_line_items").insert(linesPayload);
  if (lineErr) {
    // Roll back the parent PR if the lines fail so we don't leave orphan headers
    await supabase.from("purchase_requests").delete().eq("id", pr.id);
    const m = lineErr.message.toLowerCase();
    let friendly = `Line items: ${lineErr.message}`;
    if (m.includes("uom_fkey")) friendly = "One or more lines have a Unit of Measure that is not in the master list. Please re-pick UoM for every line from the dropdown.";
    else if (m.includes("material_group_fkey")) friendly = "One or more lines have an invalid Material Group. Please re-pick from the dropdown.";
    else if (m.includes("plant_code_fkey")) friendly = "One or more lines have an invalid Plant Code. Please re-pick from the dropdown.";
    else if (m.includes("purchasing_group_fkey")) friendly = "One or more lines have an invalid Purchasing Group. Please re-pick from the dropdown.";
    else if (m.includes("cost_centre_fkey") || m.includes("cost_bearer_fkey")) friendly = "One or more lines have an invalid Cost Centre / Cost Bearer. Please re-pick from the dropdown.";
    else if (m.includes("gl_account_fkey")) friendly = "One or more lines have an invalid G/L Account. Please re-pick from the dropdown.";
    else if (m.includes("infinite recursion")) friendly = "Server permission error (RLS). Refresh the page and try again.";
    return { error: friendly };
  }

  if (input.action === "draft") return { id: pr.id };

  // Submit: select matching approval rule, update status
  const { data: prFull } = await supabase.from("purchase_requests").select("total_value").eq("id", pr.id).single();
  const total = Number(prFull?.total_value || 0);
  const { data: rules } = await supabase
    .from("approval_rules").select("*").eq("is_active", true);
  const rule = (rules || []).find(r => total >= Number(r.min_amount) && (r.max_amount === null || total <= Number(r.max_amount)));
  if (!rule) {
    await supabase.from("purchase_requests").delete().eq("id", pr.id);
    return { error: "No active approval rule matches this amount. Ask an admin to configure rules." };
  }

  const { error: updErr } = await supabase.from("purchase_requests").update({
    approval_rule_id: rule.id,
    status: "pending_l1",
    current_level: 1,
    submitted_at: new Date().toISOString()
  }).eq("id", pr.id);
  if (updErr) return { error: updErr.message };

  // Notify L1 approvers
  notifyApprovers(pr.id, 1).catch(() => {});

  return { id: pr.id };
}

async function notifyApprovers(prId: string, level: number) {
  const supabase = supabaseServer();
  const { data: pr } = await supabase.from("purchase_requests")
    .select("pr_number, total_value, purpose_of_procurement, approval_rule_id").eq("id", prId).single();
  if (!pr) return;
  const { data: rule } = await supabase.from("approval_rules").select("*").eq("id", pr.approval_rule_id).single();
  if (!rule) return;
  const groupId = (rule as any)[`level_${level}_group_id`];
  if (!groupId) return;
  const { data: members } = await supabase
    .from("role_group_members").select("user_id, app_users:app_users!inner(email, full_name)").eq("role_group_id", groupId);
  const emails = (members || []).map((m: any) => m.app_users.email).filter(Boolean);
  if (emails.length === 0) return;
  const html = emailTemplate({
    title: `Approval needed: ${pr.pr_number}`,
    bodyHtml: `<p>A new Purchase Request requires your approval.</p><ul><li><b>PR:</b> ${pr.pr_number}</li><li><b>Purpose:</b> ${pr.purpose_of_procurement}</li><li><b>Total:</b> ₹ ${Number(pr.total_value).toLocaleString("en-IN")}</li></ul>`,
    actionHref: `${process.env.APP_URL || ""}/queue/${prId}`,
    actionLabel: "Review PR"
  });
  await sendEmail(emails, `[${pr.pr_number}] Approval requested`, html);
}
