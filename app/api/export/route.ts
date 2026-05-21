import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const { data: me } = await supabase.from("app_users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const [prs, lines, appr] = await Promise.all([
    supabase.from("purchase_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("pr_line_items").select("*"),
    supabase.from("pr_approvals").select("*")
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "PR System";
  const inrFmt = '"₹"#,##,##0.00';

  // Sheet 1: PRs
  const s1 = wb.addWorksheet("PRs");
  s1.columns = [
    { header: "PR Number", key: "pr_number", width: 18 },
    { header: "Status", key: "status", width: 16 },
    { header: "Type", key: "pr_type", width: 8 },
    { header: "Requestor", key: "requirement_received_from", width: 22 },
    { header: "Department", key: "department", width: 16 },
    { header: "Location", key: "location", width: 16 },
    { header: "Purpose", key: "purpose_of_procurement", width: 40 },
    { header: "Total (₹)", key: "total_value", width: 18, style: { numFmt: inrFmt } },
    { header: "Created", key: "created_at", width: 22 },
    { header: "Submitted", key: "submitted_at", width: 22 },
    { header: "Approved", key: "approved_at", width: 22 }
  ];
  s1.getRow(1).font = { bold: true };
  s1.addRows((prs.data || []).map((r: any) => ({ ...r })));

  // Sheet 2: Line items
  const s2 = wb.addWorksheet("Line Items");
  s2.columns = [
    { header: "PR ID", key: "pr_id", width: 36 },
    { header: "Item No", key: "item_no", width: 8 },
    { header: "Short Text", key: "short_text", width: 40 },
    { header: "UoM", key: "uom", width: 8 },
    { header: "Qty", key: "quantity", width: 10 },
    { header: "Price (₹)", key: "valuation_price", width: 14, style: { numFmt: inrFmt } },
    { header: "Total (₹)", key: "total_value", width: 14, style: { numFmt: inrFmt } },
    { header: "Delivery", key: "delivery_date", width: 14 },
    { header: "Material Group", key: "material_group", width: 14 },
    { header: "Plant", key: "plant_code", width: 10 },
    { header: "PGr", key: "purchasing_group", width: 8 },
    { header: "Requisitioner", key: "requisitioner_name", width: 22 },
    { header: "Cost Centre", key: "cost_centre", width: 12 },
    { header: "G/L", key: "gl_account", width: 10 },
    { header: "Cost Bearer", key: "cost_bearer", width: 12 }
  ];
  s2.getRow(1).font = { bold: true };
  s2.addRows((lines.data || []) as any[]);

  // Sheet 3: Approvals
  const s3 = wb.addWorksheet("Approvals");
  s3.columns = [
    { header: "PR ID", key: "pr_id", width: 36 },
    { header: "Level", key: "level", width: 8 },
    { header: "Approver ID", key: "approver_id", width: 36 },
    { header: "Decision", key: "decision", width: 12 },
    { header: "Comment", key: "comment", width: 40 },
    { header: "Decided", key: "decided_at", width: 22 }
  ];
  s3.getRow(1).font = { bold: true };
  s3.addRows((appr.data || []) as any[]);

  const buf = await wb.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(buf as any, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="pr-export-${stamp}.xlsx"`
    }
  });
}
