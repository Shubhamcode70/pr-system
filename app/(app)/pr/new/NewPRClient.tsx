"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
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

  // Header
  const [hdr, setHdr] = useState({
    requirement_received_from: "", department: "", location: "",
    purpose_of_procurement: "", pr_type: "OPEX" as "CAPEX" | "OPEX",
    cr_id: "", asset_number: "", single_vendor_flag: false, single_vendor_justification: "",
    preferred_vendor_name: ""
  });

  const [lines, setLines] = useState<Line[]>([blankLine(1)]);
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

  async function submit(action: "draft" | "submit") {
    setBusy(true); setErr(null);
    const res = await createPR({ header: hdr, lines, action });
    setBusy(false);
    if ("error" in res) { setErr(res.error); return; }
    router.push(`/pr/${res.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">New Purchase Request</h1>
        <div className="text-sm text-slate-500">Step {step} of 3</div>
      </div>

      {/* Step 1 — Header */}
      {step === 1 && (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold">Section 1 — Header</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label required>Requirement Received From</Label><Input value={hdr.requirement_received_from} onChange={e => setHdr({ ...hdr, requirement_received_from: e.target.value })} /></div>
            <div><Label required>Department</Label><Input value={hdr.department} onChange={e => setHdr({ ...hdr, department: e.target.value })} /></div>
            <div><Label required>Location</Label><Input value={hdr.location} onChange={e => setHdr({ ...hdr, location: e.target.value })} /></div>
            <div><Label required>PR Type</Label>
              <Select value={hdr.pr_type} onChange={e => setHdr({ ...hdr, pr_type: e.target.value as "CAPEX" | "OPEX", cr_id: "", asset_number: "" })}>
                <option value="OPEX">OPEX</option>
                <option value="CAPEX">CAPEX</option>
              </Select>
            </div>
          </div>
          <div><Label required>Purpose of Procurement</Label><Textarea rows={3} value={hdr.purpose_of_procurement} onChange={e => setHdr({ ...hdr, purpose_of_procurement: e.target.value })} /></div>

          {hdr.pr_type === "CAPEX" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-amber-50 border border-amber-200 rounded">
              <div><Label required>CR ID</Label>
                <Select value={hdr.cr_id} onChange={e => setHdr({ ...hdr, cr_id: e.target.value, asset_number: "" })}>
                  <option value="">— select —</option>
                  {masters.crs.map(c => <option key={c.cr_id} value={c.cr_id}>{c.cr_id} — {c.title}</option>)}
                </Select>
              </div>
              <div><Label required>Asset Number</Label>
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
            <div><Label required>Single Vendor Justification</Label><Textarea rows={3} value={hdr.single_vendor_justification} onChange={e => setHdr({ ...hdr, single_vendor_justification: e.target.value })} /></div>
          )}
          <div><Label>Preferred Vendor (optional)</Label><Input value={hdr.preferred_vendor_name} onChange={e => setHdr({ ...hdr, preferred_vendor_name: e.target.value })} /></div>

          <div className="flex justify-end pt-4">
            <Button onClick={() => setStep(2)}>Next: Line Items →</Button>
          </div>
        </Card>
      )}

      {/* Step 2 — Lines */}
      {step === 2 && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Section 2 — Line Items ({lines.length}/100)</h2>
            <Button variant="secondary" onClick={addLine} disabled={lines.length >= 100}>+ Add Line</Button>
          </div>

          {lines.map((l, i) => (
            <div key={i} className="border border-slate-200 rounded-md p-4 bg-slate-50/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Line {l.item_no}</h3>
                <button onClick={() => removeLine(i)} disabled={lines.length === 1} className="text-sm text-red-600 hover:underline disabled:opacity-30">Remove</button>
              </div>

              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">2A · Basic Item Details</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="md:col-span-3"><Label required>Short Text</Label><Input value={l.short_text} onChange={e => updLine(i, { short_text: e.target.value })} /></div>
                <div><Label required>UoM</Label>
                  <Select value={l.uom} onChange={e => updLine(i, { uom: e.target.value })}>
                    <option value="">—</option>
                    {masters.uoms.map(u => <option key={u.code} value={u.code}>{u.code} — {u.description}</option>)}
                  </Select>
                </div>
                <div><Label required>Quantity</Label><Input type="number" step="0.001" min={0.001} value={l.quantity} onChange={e => updLine(i, { quantity: parseFloat(e.target.value) || 0 })} /></div>
                <div><Label required>Valuation Price (₹)</Label><Input type="number" step="0.01" min={0} value={l.valuation_price} onChange={e => updLine(i, { valuation_price: parseFloat(e.target.value) || 0 })} /></div>
                <div><Label>Total Value</Label><Input value={inr(l.quantity * l.valuation_price)} readOnly className="bg-slate-100" /></div>
                <div><Label required>Delivery Date</Label><Input type="date" value={l.delivery_date} onChange={e => updLine(i, { delivery_date: e.target.value })} /></div>
              </div>

              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">2B · Classification & Logistics</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div><Label required>Material Group</Label>
                  <Select value={l.material_group} onChange={e => updLine(i, { material_group: e.target.value })}>
                    <option value="">—</option>
                    {masters.mgs.map(m => <option key={m.code} value={m.code}>{m.code} — {m.name}</option>)}
                  </Select>
                </div>
                <div><Label required>Plant Code</Label>
                  <Select value={l.plant_code} onChange={e => updLine(i, { plant_code: e.target.value })}>
                    <option value="">—</option>
                    {masters.plants.map(p => <option key={p.code} value={p.code}>{p.code} — {p.name}</option>)}
                  </Select>
                </div>
                <div><Label required>Purchasing Group</Label>
                  <Select value={l.purchasing_group} onChange={e => updLine(i, { purchasing_group: e.target.value })}>
                    <option value="">—</option>
                    {masters.pgs.map(p => <option key={p.code} value={p.code}>{p.code} — {p.name}</option>)}
                  </Select>
                </div>
                <div><Label required>Requisitioner Name</Label><Input value={l.requisitioner_name} onChange={e => updLine(i, { requisitioner_name: e.target.value })} /></div>
              </div>

              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">2C · Account Assignment</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label required>Acct. Assignment Qty</Label><Input type="number" step="0.001" min={0.001} value={l.acct_assignment_qty} onChange={e => updLine(i, { acct_assignment_qty: parseFloat(e.target.value) || 0 })} /></div>
                <div><Label required>Cost Centre</Label>
                  <Select value={l.cost_centre} onChange={e => updLine(i, { cost_centre: e.target.value })}>
                    <option value="">—</option>
                    {masters.ccs.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                  </Select>
                </div>
                <div><Label required>G/L Account</Label>
                  <Select value={l.gl_account} onChange={e => updLine(i, { gl_account: e.target.value })}>
                    <option value="">—</option>
                    {masters.gls.filter(g => g.expense_type === hdr.pr_type).map(g => <option key={g.code} value={g.code}>{g.code} — {g.name} ({g.expense_type})</option>)}
                  </Select>
                </div>
                <div><Label required>Cost Bearer (Cost Centre)</Label>
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
              <Button onClick={() => setStep(3)}>Review →</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3 — Review & Submit */}
      {step === 3 && (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold">Section 3 — Review</h2>
          <p className="text-sm text-slate-600">Confirm and submit. Once submitted, the PR enters the approval workflow based on the total amount.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div><span className="text-slate-500">Requestor:</span> {hdr.requirement_received_from}</div>
            <div><span className="text-slate-500">Dept / Loc:</span> {hdr.department} / {hdr.location}</div>
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

          {err && <p role="alert" className="text-sm text-red-600">{err}</p>}

          <div className="flex items-center justify-between pt-4">
            <Button variant="secondary" onClick={() => setStep(2)}>← Back</Button>
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
