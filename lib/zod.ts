import { z } from "zod";

export const lineItemSchema = z.object({
  item_no: z.number().int().min(1).max(100),
  short_text: z.string().min(2).max(500),
  uom: z.string().min(1),
  quantity: z.number().positive(),
  valuation_price: z.number().nonnegative(),
  delivery_date: z.string().min(1),
  material_group: z.string().min(1),
  plant_code: z.string().min(1),
  purchasing_group: z.string().min(1),
  requisitioner_name: z.string().min(2),
  acct_assignment_qty: z.number().positive(),
  cost_centre: z.string().min(1),
  gl_account: z.string().min(1),
  cost_bearer: z.string().min(1)
});

export const prHeaderSchema = z.object({
  requirement_received_from: z.string().min(2),
  department: z.string().min(1),
  location: z.string().min(1),
  purpose_of_procurement: z.string().min(5),
  pr_type: z.enum(["CAPEX", "OPEX"]),
  cr_id: z.string().optional().nullable(),
  asset_number: z.string().optional().nullable(),
  single_vendor_flag: z.boolean().default(false),
  single_vendor_justification: z.string().optional().nullable(),
  preferred_vendor_name: z.string().optional().nullable()
}).refine(d => d.pr_type === "OPEX" || (!!d.cr_id && !!d.asset_number), {
  message: "CAPEX requires CR ID and Asset Number",
  path: ["cr_id"]
}).refine(d => !d.single_vendor_flag || (d.single_vendor_justification && d.single_vendor_justification.trim().length > 0), {
  message: "Single vendor justification required",
  path: ["single_vendor_justification"]
});

export type LineItemInput = z.infer<typeof lineItemSchema>;
