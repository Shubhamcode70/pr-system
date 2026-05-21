"use client";
import { useState } from "react";
import { Button, Card, Input, Badge } from "@/components/ui";
import { searchPR } from "./actions";

type ApprovalStep = { level: string; designation: string; name: string; sap: string; emp_id: string; date: string; done: boolean };
type Result = {
  status: string; status_class: "approved" | "pending" | "inprogress";
  summary: Record<string, string>;
  approval_chain: ApprovalStep[];
  items: Record<string, string>[];
  total_items: number;
  has_matrix: boolean;
};

export default function TrackerSearch({ hasData }: { hasData: boolean }) {
  const [pr, setPr] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<Result | null>(null);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setRes(null);
    if (!pr.trim()) { setErr("Please enter a PR number."); return; }
    setBusy(true);
    const r = await searchPR(pr.trim());
    setBusy(false);
    if (!("status" in r)) { setErr(r.error); return; }
    setRes(r as Result);
  }

  const statusColor = (cl: string) => cl === "approved" ? "green" : cl === "pending" ? "yellow" : "blue";

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={onSearch} className="flex gap-2">
          <Input placeholder="Enter PR Number (e.g., 1000045678)" value={pr} onChange={e => setPr(e.target.value)} disabled={!hasData} />
          <Button type="submit" disabled={busy || !hasData}>{busy ? "Searching…" : "Search"}</Button>
        </form>
        {err && <p role="alert" className="text-sm text-red-600 mt-2">{err}</p>}
      </Card>

      {res && (
        <>
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">PR {res.summary.pr_number}</h2>
              <Badge color={statusColor(res.status_class)}>{res.status}</Badge>
            </div>
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              {[
                ["Plant", res.summary.plant],
                ["Username", res.summary.username],
                ["Requisitioner", res.summary.requester],
                ["Total Value", res.summary.total_value],
                ["UoM", res.summary.uom],
                ["Request Date", res.summary.req_date],
                ["Cost Centre", res.summary.cost_center],
                ["CC Description", res.summary.cc_desc],
                ["Business", res.summary.business],
                ["Location", res.summary.location],
                ["Function", res.summary.function],
                ["Purch. Group", res.summary.purch_group],
                ["PO Number", res.summary.po_number],
                ["PO Date", res.summary.po_date],
                ["Final Release", res.summary.final_date]
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k as string}><dt className="text-slate-500">{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          </Card>

          <Card>
            <h3 className="font-semibold mb-3">Approval Chain</h3>
            <ol className="space-y-3">
              {res.approval_chain.map((a, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${a.done ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{a.level}</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{a.designation}</div>
                    <div className="text-xs text-slate-600">{a.name}{a.sap ? ` · ${a.sap}` : ""}{a.emp_id ? ` · #${a.emp_id}` : ""}</div>
                  </div>
                  <div className="text-xs">{a.done ? <Badge color="green">✓ {a.date}</Badge> : <Badge color="slate">pending</Badge>}</div>
                </li>
              ))}
            </ol>
            {!res.has_matrix && <p className="mt-3 text-xs text-amber-700">No matrix entry for this cost centre — showing positional fallback.</p>}
          </Card>

          {res.items.length > 0 && (
            <Card className="p-0 overflow-hidden">
              <h3 className="font-semibold p-4 border-b">Line Items ({res.total_items})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>{Object.keys(res.items[0]).map(k => <th key={k} className="text-left px-3 py-2">{k}</th>)}</tr>
                  </thead>
                  <tbody>
                    {res.items.map((it, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        {Object.values(it).map((v, j) => <td key={j} className="px-3 py-2">{v as string}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
