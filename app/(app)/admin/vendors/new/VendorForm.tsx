"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { FieldLabel } from "@/components/FieldLabel";
import { createVendor } from "./actions";

export default function VendorForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef(false);

  const [f, setF] = useState({
    legal_name: "", trade_name: "", gstin: "", pan: "", msme_registered: false,
    address_line1: "", address_line2: "", city: "", state: "", pincode: "", country: "India",
    contact_name: "", contact_email: "", contact_phone: "",
    bank_name: "", account_no: "", ifsc: "",
    payment_terms: "Net 30", currency: "INR", notes: "",
    status: "active" as "draft" | "active"
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (ref.current) return;
    ref.current = true; setBusy(true); setErr(null);
    const res = await createVendor(f);
    if (!("id" in res)) { setErr(res.error); ref.current = false; setBusy(false); return; }
    router.push("/admin/vendors");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="space-y-3">
        <h3 className="font-medium text-slate-700 text-sm uppercase tracking-wide">Identity</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><FieldLabel required>Legal Name</FieldLabel><Input required value={f.legal_name} onChange={e => setF({...f, legal_name: e.target.value})} /></div>
          <div><FieldLabel>Trade Name</FieldLabel><Input value={f.trade_name} onChange={e => setF({...f, trade_name: e.target.value})} /></div>
          <div><FieldLabel>GSTIN</FieldLabel><Input placeholder="15 chars, e.g., 27ABCDE1234F1Z5" value={f.gstin} onChange={e => setF({...f, gstin: e.target.value.toUpperCase()})} /></div>
          <div><FieldLabel>PAN</FieldLabel><Input placeholder="10 chars, e.g., ABCDE1234F" value={f.pan} onChange={e => setF({...f, pan: e.target.value.toUpperCase()})} /></div>
          <div className="md:col-span-2 flex items-center gap-2">
            <input type="checkbox" id="msme" checked={f.msme_registered} onChange={e => setF({...f, msme_registered: e.target.checked})} />
            <label htmlFor="msme" className="text-sm">MSME / Udyam registered (45-day payment by law)</label>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-medium text-slate-700 text-sm uppercase tracking-wide">Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2"><FieldLabel>Line 1</FieldLabel><Input value={f.address_line1} onChange={e => setF({...f, address_line1: e.target.value})} /></div>
          <div className="md:col-span-2"><FieldLabel>Line 2</FieldLabel><Input value={f.address_line2} onChange={e => setF({...f, address_line2: e.target.value})} /></div>
          <div><FieldLabel>City</FieldLabel><Input value={f.city} onChange={e => setF({...f, city: e.target.value})} /></div>
          <div><FieldLabel>State</FieldLabel><Input value={f.state} onChange={e => setF({...f, state: e.target.value})} /></div>
          <div><FieldLabel>Pincode</FieldLabel><Input placeholder="6 digits" value={f.pincode} onChange={e => setF({...f, pincode: e.target.value})} /></div>
          <div><FieldLabel>Country</FieldLabel><Input value={f.country} onChange={e => setF({...f, country: e.target.value})} /></div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-medium text-slate-700 text-sm uppercase tracking-wide">Primary Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><FieldLabel>Name</FieldLabel><Input value={f.contact_name} onChange={e => setF({...f, contact_name: e.target.value})} /></div>
          <div><FieldLabel>Email</FieldLabel><Input type="email" value={f.contact_email} onChange={e => setF({...f, contact_email: e.target.value})} /></div>
          <div><FieldLabel>Phone</FieldLabel><Input value={f.contact_phone} onChange={e => setF({...f, contact_phone: e.target.value})} /></div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-medium text-slate-700 text-sm uppercase tracking-wide">Banking (visible to Finance role)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><FieldLabel>Bank Name</FieldLabel><Input value={f.bank_name} onChange={e => setF({...f, bank_name: e.target.value})} /></div>
          <div><FieldLabel>Account No</FieldLabel><Input value={f.account_no} onChange={e => setF({...f, account_no: e.target.value})} /></div>
          <div><FieldLabel>IFSC</FieldLabel><Input placeholder="e.g., HDFC0001234" value={f.ifsc} onChange={e => setF({...f, ifsc: e.target.value.toUpperCase()})} /></div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-medium text-slate-700 text-sm uppercase tracking-wide">Commercial</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><FieldLabel required>Payment Terms</FieldLabel>
            <Select value={f.payment_terms} onChange={e => setF({...f, payment_terms: e.target.value})}>
              {["Advance", "Net 0", "Net 15", "Net 30", "Net 45", "Net 60", "Net 90"].map(p => <option key={p}>{p}</option>)}
            </Select>
          </div>
          <div><FieldLabel required>Currency</FieldLabel>
            <Select value={f.currency} onChange={e => setF({...f, currency: e.target.value})}>
              {["INR", "USD", "EUR", "GBP", "AED", "SGD"].map(p => <option key={p}>{p}</option>)}
            </Select>
          </div>
          <div><FieldLabel required>Status</FieldLabel>
            <Select value={f.status} onChange={e => setF({...f, status: e.target.value as any})}>
              <option value="active">active (immediately usable)</option>
              <option value="draft">draft (review before use)</option>
            </Select>
          </div>
        </div>
        <div><FieldLabel>Notes</FieldLabel><Textarea rows={2} value={f.notes} onChange={e => setF({...f, notes: e.target.value})} /></div>
      </section>

      {err && <p role="alert" className="text-sm text-red-600">{err}</p>}

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Create Vendor"}</Button>
      </div>
    </form>
  );
}
