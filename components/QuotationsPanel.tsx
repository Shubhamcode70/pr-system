"use client";
import { useState } from "react";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { FieldLabel } from "@/components/FieldLabel";
import { inr } from "@/lib/inr";

export type Quote = {
  vendor_id: string;
  quote_reference: string;
  quote_date: string;
  validity_date: string;
  total_amount: number;
  currency: string;
  payment_terms_offered: string;
  delivery_lead_time_days: number | "";
  notes: string;
  is_selected: boolean;
};

type Vendor = { id: string; vendor_code: string; legal_name: string; payment_terms: string; currency: string };

export function QuotationsPanel({
  vendors, quotes, setQuotes, prTotal
}: {
  vendors: Vendor[];
  quotes: Quote[];
  setQuotes: (q: Quote[]) => void;
  prTotal: number;
}) {
  function add() {
    setQuotes([...quotes, {
      vendor_id: "", quote_reference: "", quote_date: "", validity_date: "",
      total_amount: 0, currency: "INR", payment_terms_offered: "Net 30",
      delivery_lead_time_days: "", notes: "", is_selected: quotes.length === 0
    }]);
  }
  function remove(i: number) {
    const newQ = quotes.filter((_, idx) => idx !== i);
    // If we removed the selected one, auto-select the first remaining
    if (quotes[i].is_selected && newQ.length > 0) newQ[0].is_selected = true;
    setQuotes(newQ);
  }
  function update(i: number, patch: Partial<Quote>) {
    setQuotes(quotes.map((q, idx) => idx === i ? { ...q, ...patch } : q));
  }
  function selectOne(i: number) {
    setQuotes(quotes.map((q, idx) => ({ ...q, is_selected: idx === i })));
  }

  const selected = quotes.find(q => q.is_selected);
  const cheapest = quotes.length > 0 ? quotes.reduce((min, q) => q.total_amount < min.total_amount ? q : min, quotes[0]) : null;
  const variance = selected && cheapest && cheapest.total_amount > 0
    ? ((selected.total_amount - cheapest.total_amount) / cheapest.total_amount) * 100
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Vendor Quotations <span className="text-sm text-slate-500 font-normal">(optional)</span></h3>
          <p className="text-xs text-slate-500">Add competing quotations. Mark one as <b>selected</b> — that vendor becomes the proposed vendor. Adding exactly one quotation auto-flags the PR as single-vendor.</p>
        </div>
        <Button variant="secondary" onClick={add}>+ Add Quotation</Button>
      </div>

      {quotes.length === 0 ? (
        <p className="text-sm text-slate-500 italic px-4 py-6 text-center bg-slate-50 rounded">
          No quotations yet. You can submit without quotations — vendor will use the free-text field above. Or add one with the button.
        </p>
      ) : (
        <div className="space-y-3">
          {quotes.map((q, i) => (
            <div key={i} className={`border rounded-md p-4 ${q.is_selected ? "border-brand-500 bg-brand-50/30" : "border-slate-200"}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <input type="radio" name="selected-quote" checked={q.is_selected} onChange={() => selectOne(i)} aria-label="Select this quotation" />
                  <span className="text-sm font-medium">Quotation {i + 1}</span>
                  {q.is_selected && <span className="text-xs bg-brand-600 text-white px-2 py-0.5 rounded">SELECTED</span>}
                </div>
                <button onClick={() => remove(i)} className="text-sm text-red-600 hover:underline">Remove</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><FieldLabel required>Vendor</FieldLabel>
                  <Select value={q.vendor_id} onChange={e => {
                    const v = vendors.find(x => x.id === e.target.value);
                    update(i, {
                      vendor_id: e.target.value,
                      currency: v?.currency || "INR",
                      payment_terms_offered: q.payment_terms_offered || v?.payment_terms || "Net 30"
                    });
                  }}>
                    <option value="">— select active vendor —</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.vendor_code} — {v.legal_name}</option>)}
                  </Select>
                </div>
                <div><FieldLabel required>Total Amount</FieldLabel><Input type="number" step="0.01" min={0} value={q.total_amount} onChange={e => update(i, { total_amount: parseFloat(e.target.value) || 0 })} /></div>
                <div><FieldLabel>Quote Reference</FieldLabel><Input value={q.quote_reference} onChange={e => update(i, { quote_reference: e.target.value })} placeholder="e.g., QUO/2026/00123" /></div>
                <div><FieldLabel>Currency</FieldLabel>
                  <Select value={q.currency} onChange={e => update(i, { currency: e.target.value })}>
                    {["INR", "USD", "EUR", "GBP", "AED", "SGD"].map(c => <option key={c}>{c}</option>)}
                  </Select>
                </div>
                <div><FieldLabel>Quote Date</FieldLabel><Input type="date" value={q.quote_date} onChange={e => update(i, { quote_date: e.target.value })} /></div>
                <div><FieldLabel>Validity Date</FieldLabel><Input type="date" value={q.validity_date} onChange={e => update(i, { validity_date: e.target.value })} /></div>
                <div><FieldLabel>Payment Terms Offered</FieldLabel>
                  <Select value={q.payment_terms_offered} onChange={e => update(i, { payment_terms_offered: e.target.value })}>
                    {["Advance", "Net 0", "Net 15", "Net 30", "Net 45", "Net 60", "Net 90"].map(p => <option key={p}>{p}</option>)}
                  </Select>
                </div>
                <div><FieldLabel>Lead Time (days)</FieldLabel><Input type="number" min={0} value={q.delivery_lead_time_days} onChange={e => update(i, { delivery_lead_time_days: e.target.value === "" ? "" : parseInt(e.target.value, 10) })} /></div>
                <div className="md:col-span-2"><FieldLabel>Notes</FieldLabel><Textarea rows={2} value={q.notes} onChange={e => update(i, { notes: e.target.value })} /></div>
              </div>
            </div>
          ))}

          {/* Comparison summary */}
          {quotes.length > 1 && (
            <div className="bg-slate-50 border rounded p-3 text-xs space-y-1">
              <div><b>Comparison:</b></div>
              <div>Cheapest: {inr(cheapest?.total_amount || 0)} from {vendors.find(v => v.id === cheapest?.vendor_id)?.legal_name || "—"}</div>
              <div>Selected: {inr(selected?.total_amount || 0)} from {vendors.find(v => v.id === selected?.vendor_id)?.legal_name || "—"}</div>
              {Math.abs(variance) > 10 && selected && cheapest && selected.vendor_id !== cheapest.vendor_id && (
                <div className="text-amber-700 font-medium">⚠ Selected vendor is {variance.toFixed(1)}% above the cheapest — please justify in the PR Purpose field.</div>
              )}
              {Math.abs(prTotal - (selected?.total_amount || 0)) > 1 && selected && (
                <div className="text-amber-700">⚠ Selected quote total ({inr(selected.total_amount)}) differs from PR line-item total ({inr(prTotal)}).</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
