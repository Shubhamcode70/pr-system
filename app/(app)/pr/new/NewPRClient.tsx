"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Select, Textarea } from "@/components/ui";
import { FieldLabel } from "@/components/FieldLabel";
import InstructionsPopup from "@/components/InstructionsPopup";
import { QuotationsPanel, type Quote } from "@/components/QuotationsPanel";
import { inr } from "@/lib/inr";
import { createPR } from "./actions";

type Master = {
  uoms: { code: string; description: string }[];
  mgs: { code: string; name: string }[];
  plants: { code: string; name: string }[];
  pgs: { code: string; name: string }[];
  ccs: { code: string; name: string }[];
  gls: { code: string; name: string; expense_type: string }[];
  crs: { cr_id: string; title: string }[];
  assets: { asset_no: string; description: string; cr_id: string | null }[];
  vendors: { id: string; vendor_code: string; legal_name: string; payment_terms: string; currency: string }[];
};

type Line = {
  item_no: number; short_text: string; uom: string; quantity: number; valuation_price: number;
  delivery_date: string; material_group: string; plant_code: string; purchasing_group: string;
  requisitioner_name: string; acct_assignment_qty: number; cost_centre: string; gl_account: string; cost_bearer: string;
};

const blankLine = (n: number): Line => ({
  item_no: n, short_text: "", uom: "", quantity: 1, valuation_price: 0,
  delivery_date: "", material_group: "", plant_code: "", purchasing_group: "",
  requisitioner_name: "", acct_assignment_qty: 1, cost_centre: "", gl_account: "", cost_bearer: ""
});

export default function NewPRClient({ masters }: { masters: Master }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const submittingRef = useRef(false); // instant guard against double-click double-submit

  // Header
  const [hdr, setHdr] = useState({
    requirement_received_from: "", department: "", location: "",
    purpose_of_procurement: "", pr_type: "OPEX" as "CAPEX" | "OPEX",
    cr_id: "", asset_number: "", single_vendor_flag: false, single_vendor_justification: "",
    preferred_vendor_name: ""
  });

  const [lines, setLines] = useState<Line[]>([blankLine(1)]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const total = lines.reduce((s, l) => s + (l.quantity * l.valuation_price), 0);
  const assetsForCR = masters.assets.filter(a => !hdr.cr_id || a.cr_id === hdr.cr_id);

  function updLine(i: number, patch: Partial<Line>) {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  }
  function addLine() {
    if (lines.length >= 100) return;
    setLines(prev => [...prev, blankLine(prev.length + 1)]);
  }
  function removeLine(i: number) {
    if (lines.length <= 1) return;
    setLines(prev => prev.filter((_, idx) => idx !== i).map((l, idx) => ({ ...l, item_no: idx + 1 })));
  }

  function validate(action: "draft" | "submit"): string[] {
    const errors: string[] = [];
    // For draft, only require minimal fields. For submit, full validation.
    if (action === "submit") {
      if (!hdr.requirement_received_from.trim()) errors.push("Header: Requirement Received From is required.");
      if (!hdr.department.trim()) errors.push("Header: Department is required.");
      if (!hdr.location.trim()) errors.push("Header: Location is required.");
      if (!hdr.purpose_of_procurement.trim()) errors.push("Header: Purpose of Procurement is required.");
      if (hdr.pr_type === "CAPEX") {
        if (!hdr.cr_id) errors.push("Header: CR ID is required for CAPEX PRs.");
        if (!hdr.asset_number) errors.push("Header: Asset Number is required for CAPEX PRs.");
      }
      if (hdr.single_vendor_flag && !hdr.single_vendor_justification.trim()) {
        errors.push("Header: Single Vendor Justification is required when single-vendor flag is set.");
      }
      lines.forEach((l, idx) => {
        const n = idx + 1;
        if (!l.short_text.trim()) errors.push(`Line ${n}: Short Text is required.`);
        if (!l.uom) errors.push(`Line ${n}: Unit of Measure is required.`);
        if (!l.quantity || l.quantity <= 0) errors.push(`Line ${n}: Quantity must be greater than 0.`);
        if (l.valuation_price === null || l.valuation_price === undefined || l.valuation_price < 0) errors.push(`Line ${n}: Valuation Price must be 0 or greater.`);
        if (!l.delivery_date) errors.push(`Line ${n}: Delivery Date is required.`);
        else {
          const d = new Date(l.delivery_date);
          const today = new Date(); today.setHours(0,0,0,0);
          if (d < today) errors.push(`Line ${n}: Delivery Date cannot be in the past.`);
        }
        if (!l.material_group) errors.push(`Line ${n}: Material Group is required.`);
        if (!l.plant_code) errors.push(`Line ${n}: Plant Code is required.`);
        if (!l.purchasing_group) errors.push(`Line ${n}: Purchasing Group is required.`);
        if (!l.requisitioner_name.trim()) errors.push(`Line ${n}: Requisitioner is required.`);
        if (!l.acct_assignment_qty || l.acct_assignment_qty <= 0) errors.push(`Line ${n}: Acct. Assignment Qty must be greater than 0.`);
        if (!l.cost_centre) errors.push(`Line ${n}: Cost Centre is required.`);
        if (!l.gl_account) errors.push(`Line ${n}: G/L Account is required.`);
        if (!l.cost_bearer) errors.push(`Line ${n}: Cost Bearer is required.`);
      });
    } else {
      // Draft: at least one identifiable field
      if (!hdr.purpose_of_procurement.trim() && !lines.some(l => l.short_text.trim())) {
        errors.push("Add at least a Purpose or one line item description before saving as draft.");
      }
    }
    return errors;
  }

  function friendlyError(raw: string): string {
    // Translate common Postgres / Supabase errors into actionable messages
    const r = raw.toLowerCase();
    if (r.includes("pr_line_items_uom_fkey")) return "One or more lines have an invalid Unit of Measure. Please pick a UoM from the dropdown for every line.";
    if (r.includes("pr_line_items_material_group_fkey")) return "One or more lines have an invalid Material Group. Please re-pick from the dropdown.";
    if (r.includes("pr_line_items_plant_code_fkey")) return "One or more lines have an invalid Plant Code. Please re-pick from the dropdown.";
    if (r.includes("pr_line_items_purchasing_group_fkey")) return "One or more lines have an invalid Purchasing Group. Please re-pick from the dropdown.";
    if (r.includes("pr_line_items_cost_centre_fkey")) return "One or more lines have an invalid Cost Centre. Please re-pick from the dropdown.";
    if (r.includes("pr_line_items_gl_account_fkey")) return "One or more lines have an invalid G/L Account. Please re-pick from the dropdown.";
    if (r.includes("pr_line_items_cost_bearer_fkey")) return "One or more lines have an invalid Cost Bearer. Please re-pick from the dropdown.";
    if (r.includes("foreign key") && r.includes("cr_id")) return "Selected CR ID does not exist. Please pick from the CR ID dropdown.";
    if (r.includes("foreign key") && r.includes("asset_number")) return "Selected Asset Number does not exist. Please pick from the Asset Number dropdown.";
    if (r.includes("violates check constraint") && r.includes("cr_id")) return "CAPEX PRs require both CR ID and Asset Number.";
    if (r.includes("infinite recursion")) return "Server policy error. Please refresh the page and try again — if it persists, contact the admin.";
    if (r.includes("no active approval rule")) return "No active approval rule matches the PR total. Please ask an admin to configure approval rules.";
    if (r.includes("rls") || r.includes("row-level security") || r.includes("policy")) return "You don't have permission to perform this action.";
    return raw;
  }

  async function submit(action: "draft" | "submit") {
    if (submittingRef.current) return; // instant guard against rapid double-click
    setErr(null); setFieldErrors([]);

    const errs = validate(action);
    if (errs.length > 0) {
      setFieldErrors(errs);
      setErr(`Please fix ${errs.length} issue${errs.length === 1 ? "" : "s"} before ${action === "submit" ? "submitting" : "saving"}.`);
      return;
    }

    submittingRef.current = true;
    setBusy(true);
    try {
      const res = await createPR({ header: hdr, lines, quotes, action });
      if (!("id" in res)) {
        setErr(friendlyError(res.error));
        submittingRef.current = false;
        setBusy(false);
        return;
      }
      // Keep busy=true and submittingRef=true during navigation so the buttons stay disabled
      router.push(`/pr/${res.id}`);
      router.refresh();
    } catch (e: any) {
      setErr(friendlyError(e?.message || "Submission failed. Please try again."));
      submittingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <InstructionsPopup />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">New Purchase Request</h1>
        <div className="text-sm text-slate-500">Step {step} of 4</div>
      </div>

      {/* Step 1 — Header (SAP Section 1) */}
      {step === 1 && (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold">Section 1 — Header Level Fields</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><FieldLabel required helpKey="requirement_received_from">Requirement Received From</FieldLabel><Input value={hdr.requirement_received_from} onChange={e => setHdr({ ...hdr, requirement_received_from: e.target.value })} /></div>
            <div><FieldLabel required helpKey="department">Department</FieldLabel><Input value={hdr.department} onChange={e => setHdr({ ...hdr, department: e.target.value })} /></div>
            <div><FieldLabel required helpKey="location">Location</FieldLabel><Input value={hdr.location} onChange={e => setHdr({ ...hdr, location: e.target.value })} /></div>
            <div><FieldLabel required helpKey="pr_type">PR Type</FieldLabel>
              <Select value={hdr.pr_type} onChange={e => setHdr({ ...hdr, pr_type: e.target.value as "CAPEX" | "OPEX", cr_id: "", asset_number: "" })}>
                <option value="OPEX">OPEX</option>
                <option value="CAPEX">CAPEX</option>
              </Select>
            </div>
          </div>
          <div><FieldLabel required helpKey="purpose_of_procurement">Purpose of Procurement</FieldLabel><Textarea rows={3} value={hdr.purpose_of_procurement} onChange={e => setHdr({ ...hdr, purpose_of_procurement: e.target.value })} /></div>

          {hdr.pr_type === "CAPEX" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-amber-50 border border-amber-200 rounded">
              <p className="md:col-span-2 text-xs text-amber-900"><b>CAPEX PRs:</b> CR ID and Asset Number are mandatory before approval.</p>
              <div><FieldLabel required helpKey="cr_id">CR ID</FieldLabel>
                <Select value={hdr.cr_id} onChange={e => setHdr({ ...hdr, cr_id: e.target.value, asset_number: "" })}>
                  <option value="">— select —</option>
                  {masters.crs.map(c => <option key={c.cr_id} value={c.cr_id}>{c.cr_id} — {c.title}</option>)}
                </Select>
              </div>
              <div><FieldLabel required helpKey="asset_number">Asset Number</FieldLabel>
                <Select value={hdr.asset_number} onChange={e => setHdr({ ...hdr, asset_number: e.target.value })}>
                  <option value="">— select —</option>
                  {assetsForCR.map(a => <option key={a.asset_no} value={a.asset_no}>{a.asset_no} — {a.description}</option>)}
                </Select>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input type="checkbox" id="sv" checked={hdr.single_vendor_flag} onChange={e => setHdr({ ...hdr, single_vendor_flag: e.target.checked })} />
            <label htmlFor="sv" className="text-sm">Single vendor being considered</label>
          </div>
          {hdr.single_vendor_flag && (
            <div><FieldLabel required helpKey="single_vendor_justification">Single Vendor Justification</FieldLabel><Textarea rows={3} value={hdr.single_vendor_justification} onChange={e => setHdr({ ...hdr, single_vendor_justification: e.target.value })} /></div>
          )}
          <div><FieldLabel helpKey="preferred_vendor_name">Preferred Vendor (optional)</FieldLabel><Input value={hdr.preferred_vendor_name} onChange={e => setHdr({ ...hdr, preferred_vendor_name: e.target.value })} /></div>

          <div className="flex justify-end pt-4">
            <Button onClick={() => setStep(2)}>Next: Line Items →</Button>
          </div>
        </Card>
      )}

      {/* Step 2 — Lines (SAP Section 2: 2A + 2B + 2C) */}
      {step === 2 && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Section 2 — Item Level Fields ({lines.length}/100)</h2>
            <Button variant="secondary" onClick={addLine} disabled={lines.length >= 100}>+ Add Line</Button>
          </div>

          {lines.map((l, i) => (
            <div key={i} className="border border-slate-200 rounded-md p-4 bg-slate-50/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Line {l.item_no}</h3>
                <button onClick={() => removeLine(i)} disabled={lines.length === 1} className="text-sm text-red-600 hover:underline disabled:opacity-30">Remove</button>
              </div>

              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">▸ 2A · Basic Item Details</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="md:col-span-3"><FieldLabel required helpKey="short_text">Short Text (PR Line-item Details)</FieldLabel><Input value={l.short_text} onChange={e => updLine(i, { short_text: e.target.value })} /></div>
                <div><FieldLabel required helpKey="uom">Unit of Measure (UoM)</FieldLabel>
                  <Select value={l.uom} onChange={e => updLine(i, { uom: e.target.value })}>
                    <option value="">—</option>
                    {masters.uoms.map(u => <option key={u.code} value={u.code}>{u.code} — {u.description}</option>)}
                  </Select>
                </div>
                <div><FieldLabel required helpKey="quantity">Quantity</FieldLabel><Input type="number" step="0.001" min={0.001} value={l.quantity} onChange={e => updLine(i, { quantity: parseFloat(e.target.value) || 0 })} /></div>
                <div><FieldLabel required helpKey="valuation_price">Valuation Price (Val. Price)</FieldLabel><Input type="number" step="0.01" min={0} value={l.valuation_price} onChange={e => updLine(i, { valuation_price: parseFloat(e.target.value) || 0 })} /></div>
                <div><FieldLabel helpKey="total_value">Total Value</FieldLabel><Input value={inr(l.quantity * l.valuation_price)} readOnly className="bg-slate-100" /></div>
                <div><FieldLabel required helpKey="delivery_date">Delivery Date</FieldLabel><Input type="date" value={l.delivery_date} onChange={e => updLine(i, { delivery_date: e.target.value })} /></div>
              </div>

              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">▸ 2B · Classification & Logistics</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div><FieldLabel required helpKey="material_group">Material Group</FieldLabel>
                  <Select value={l.material_group} onChange={e => updLine(i, { material_group: e.target.value })}>
                    <option value="">—</option>
                    {masters.mgs.map(m => <option key={m.code} value={m.code}>{m.code} — {m.name}</option>)}
                  </Select>
                </div>
                <div><FieldLabel required helpKey="plant_code">Plant Code</FieldLabel>
                  <Select value={l.plant_code} onChange={e => updLine(i, { plant_code: e.target.value })}>
                    <option value="">—</option>
                    {masters.plants.map(p => <option key={p.code} value={p.code}>{p.code} — {p.name}</option>)}
                  </Select>
                </div>
                <div><FieldLabel required helpKey="purchasing_group">Purchasing Group (PGr)</FieldLabel>
                  <Select value={l.purchasing_group} onChange={e => updLine(i, { purchasing_group: e.target.value })}>
                    <option value="">—</option>
                    {masters.pgs.map(p => <option key={p.code} value={p.code}>{p.code} — {p.name}</option>)}
                  </Select>
                </div>
                <div><FieldLabel required helpKey="requisitioner_name">Requisitioner</FieldLabel><Input value={l.requisitioner_name} onChange={e => updLine(i, { requisitioner_name: e.target.value })} /></div>
              </div>

              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">▸ 2C · Account Assignment</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><FieldLabel required helpKey="acct_assignment_qty">Quantity (Acct. Assignment)</FieldLabel><Input type="number" step="0.001" min={0.001} value={l.acct_assignment_qty} onChange={e => updLine(i, { acct_assignment_qty: parseFloat(e.target.value) || 0 })} /></div>
                <div><FieldLabel required helpKey="cost_centre">Cost Centre</FieldLabel>
                  <Select value={l.cost_centre} onChange={e => updLine(i, { cost_centre: e.target.value })}>
                    <option value="">—</option>
                    {masters.ccs.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                  </Select>
                </div>
                <div><FieldLabel required helpKey="gl_account">G/L Account (G/L Acct)</FieldLabel>
                  <Select value={l.gl_account} onChange={e => updLine(i, { gl_account: e.target.value })}>
                    <option value="">—</option>
                    {masters.gls.filter(g => g.expense_type === hdr.pr_type).map(g => <option key={g.code} value={g.code}>{g.code} — {g.name} ({g.expense_type})</option>)}
                  </Select>
                </div>
                <div><FieldLabel required helpKey="cost_bearer">Cost Centre (Cost Bearer)</FieldLabel>
                  <Select value={l.cost_bearer} onChange={e => updLine(i, { cost_bearer: e.target.value })}>
                    <option value="">—</option>
                    {masters.ccs.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                  </Select>
                </div>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between pt-4">
            <div className="text-lg">Total: <span className="font-bold">{inr(total)}</span></div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(1)}>← Back</Button>
              <Button onClick={() => setStep(3)}>Next: Vendor Quotations →</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3 — Vendor Quotations (new in Phase 2) */}
      {step === 3 && (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold">Section 3 — Vendor Quotations</h2>
          <QuotationsPanel vendors={masters.vendors} quotes={quotes} setQuotes={setQuotes} prTotal={total} />
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="secondary" onClick={() => setStep(2)}>← Back</Button>
            <Button onClick={() => setStep(4)}>Review →</Button>
          </div>
        </Card>
      )}

      {/* Step 4 — Review & Submit */}
      {step === 4 && (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold">Section 4 — Review & Submit</h2>
          <p className="text-sm text-slate-600">Confirm and submit. Once submitted, the PR enters the approval workflow based on the total amount.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div><span className="text-slate-500">Requirement Received From:</span> {hdr.requirement_received_from}</div>
            <div><span className="text-slate-500">Department / Location:</span> {hdr.department} / {hdr.location}</div>
            <div><span className="text-slate-500">PR Type:</span> {hdr.pr_type}</div>
            {hdr.pr_type === "CAPEX" && (<>
              <div><span className="text-slate-500">CR ID:</span> {hdr.cr_id}</div>
              <div><span className="text-slate-500">Asset:</span> {hdr.asset_number}</div>
            </>)}
            <div className="md:col-span-2"><span className="text-slate-500">Purpose:</span> {hdr.purpose_of_procurement}</div>
            {hdr.single_vendor_flag && <div className="md:col-span-2"><span className="text-slate-500">Single Vendor Justification:</span> {hdr.single_vendor_justification}</div>}
          </div>

          <div className="overflow-x-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr><th className="text-left px-3 py-2">#</th><th className="text-left px-3 py-2">Item</th><th className="text-right px-3 py-2">Qty</th><th className="text-left px-3 py-2">UoM</th><th className="text-right px-3 py-2">Price</th><th className="text-right px-3 py-2">Total</th></tr>
              </thead>
              <tbody>
                {lines.map(l => (
                  <tr key={l.item_no} className="border-t border-slate-100">
                    <td className="px-3 py-2">{l.item_no}</td>
                    <td className="px-3 py-2">{l.short_text || <em className="text-red-500">missing</em>}</td>
                    <td className="px-3 py-2 text-right">{l.quantity}</td>
                    <td className="px-3 py-2">{l.uom}</td>
                    <td className="px-3 py-2 text-right">{inr(l.valuation_price)}</td>
                    <td className="px-3 py-2 text-right font-mono">{inr(l.quantity * l.valuation_price)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold"><td colSpan={5} className="px-3 py-2 text-right">Total</td><td className="px-3 py-2 text-right">{inr(total)}</td></tr>
              </tfoot>
            </table>
          </div>

          {err && (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-800">{err}</p>
              {fieldErrors.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-xs text-red-700 space-y-0.5 max-h-48 overflow-y-auto">
                  {fieldErrors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-4">
            <Button variant="secondary" onClick={() => setStep(3)} disabled={busy}>← Back</Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => submit("draft")} disabled={busy}>Save as Draft</Button>
              <Button onClick={() => submit("submit")} disabled={busy}>{busy ? "Submitting…" : "Submit for Approval"}</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
