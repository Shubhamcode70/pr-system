// SAP PR Checksheet — verbatim descriptions per field. Used by the help tooltips on /pr/new.
export const fieldHelp = {
  // --- Section 1: Header Level Fields ---
  requirement_received_from: "Full name of the person raising the requirement.",
  department: "Department name (the Department & Location pair in the SAP checksheet).",
  location: "Site / plant location where the requirement originates.",
  purpose_of_procurement: "Clear description of why this PR is being raised.",
  single_vendor_flag: "Tick when only one vendor is being considered for this requirement.",
  single_vendor_justification: "Justification / document if only one vendor is being considered. Mandatory when the single-vendor flag is ticked.",
  pr_type: "Select one: CAPEX or OPEX. CAPEX PRs require a CR ID and Asset Number — both mandatory before approval.",
  cr_id: "Capital Request ID linked to this purchase. Mandatory for CAPEX only.",
  asset_number: "Asset number associated with the capital item. Mandatory for CAPEX only.",
  preferred_vendor_name: "Optional. Name of a preferred vendor, if any.",

  // --- Section 2A: Basic Item Details ---
  item_no: "Line-item number in the PR.",
  short_text: "Concise description of the material or service being procured.",
  uom: "Unit of Measure — e.g., EA (Each), KG, LTR, SET, MT.",
  quantity: "Number of units required.",
  valuation_price: "Unit price per UoM (in ₹).",
  total_value: "Auto-calculated as Quantity × Valuation Price.",
  delivery_date: "Expected delivery date. Format: DD / MM / YYYY.",

  // --- Section 2B: Classification & Logistics ---
  material_group: "Item category — e.g., IT Consumables, Hardware, Stationery, Services.",
  plant_code: "Location / plant code where the material or service will be delivered.",
  purchasing_group: "Code for the purchasing team responsible for this PR (PGr).",
  requisitioner_name: "Name of the end-user who will receive or use the item.",

  // --- Section 2C: Account Assignment ---
  acct_assignment_qty: "Number of units for which the account assignment applies.",
  cost_centre: "Department code to which the cost will be charged.",
  gl_account: "G/L account specifying the expense type for cost booking. Must match the PR type (CAPEX/OPEX).",
  cost_bearer: "Department that will ultimately bear and absorb the cost (Cost Centre — Cost Bearer)."
} as const;

export type FieldKey = keyof typeof fieldHelp;
