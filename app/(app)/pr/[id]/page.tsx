import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Badge, Button, Card, statusColor } from "@/components/ui";
import { inr } from "@/lib/inr";

export const dynamic = "force-dynamic";

export default async function PRDetail({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: pr } = await supabase
    .from("purchase_requests")
    .select("*, requester:app_users!purchase_requests_requester_id_fkey(email, full_name)")
    .eq("id", params.id)
    .maybeSingle();
  if (!pr) return notFound();

  const { data: lines } = await supabase.from("pr_line_items").select("*").eq("pr_id", params.id).order("item_no");
  const { data: appr } = await supabase
    .from("pr_approvals")
    .select("*, approver:app_users!pr_approvals_approver_id_fkey(email, full_name)")
    .eq("pr_id", params.id)
    .order("decided_at", { ascending: true });

  const isOwner = (pr as any).requester_id === user!.id;
  const isApproverNow = ((pr as any).status as string).startsWith("pending_");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{(pr as any).pr_number}</h1>
          <p className="text-sm text-slate-500">Raised by {(pr as any).requester?.full_name || (pr as any).requester?.email} on {new Date((pr as any).created_at).toLocaleString("en-IN")}</p>
        </div>
        <Badge color={statusColor((pr as any).status)}>{(pr as any).status}{(pr as any).current_level ? ` (L${(pr as any).current_level})` : ""}</Badge>
      </div>

      {isApproverNow && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 flex items-center justify-between">
          <p className="text-sm">If this PR is in your approval queue, you can act on it now.</p>
          <Link href={`/queue/${(pr as any).id}`}><Button>Open in Approval Queue</Button></Link>
        </div>
      )}

      <Card>
        <h2 className="font-semibold mb-3">Header</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div><dt className="text-slate-500">Requirement received from</dt><dd>{(pr as any).requirement_received_from}</dd></div>
          <div><dt className="text-slate-500">Department / Location</dt><dd>{(pr as any).department} / {(pr as any).location}</dd></div>
          <div className="md:col-span-2"><dt className="text-slate-500">Purpose</dt><dd>{(pr as any).purpose_of_procurement}</dd></div>
          <div><dt className="text-slate-500">PR Type</dt><dd>{(pr as any).pr_type}</dd></div>
          {(pr as any).pr_type === "CAPEX" && (<>
            <div><dt className="text-slate-500">CR ID</dt><dd>{(pr as any).cr_id}</dd></div>
            <div><dt className="text-slate-500">Asset Number</dt><dd>{(pr as any).asset_number}</dd></div>
          </>)}
          {(pr as any).single_vendor_flag && (
            <div className="md:col-span-2"><dt className="text-slate-500">Single Vendor Justification</dt><dd>{(pr as any).single_vendor_justification}</dd></div>
          )}
          {(pr as any).preferred_vendor_name && <div><dt className="text-slate-500">Preferred Vendor</dt><dd>{(pr as any).preferred_vendor_name}</dd></div>}
          <div><dt className="text-slate-500">Total Value</dt><dd className="font-mono font-semibold">{inr((pr as any).total_value)}</dd></div>
        </dl>
      </Card>

      <Card className="p-0 overflow-hidden">
        <h2 className="font-semibold p-4 border-b">Line Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-left">UoM</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Price</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-left">Delivery</th>
                <th className="px-3 py-2 text-left">CC / GL</th>
              </tr>
            </thead>
            <tbody>
              {(lines || []).map((l: any) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{l.item_no}</td>
                  <td className="px-3 py-2 max-w-xs">{l.short_text}</td>
                  <td className="px-3 py-2">{l.uom}</td>
                  <td className="px-3 py-2 text-right">{l.quantity}</td>
                  <td className="px-3 py-2 text-right">{inr(l.valuation_price)}</td>
                  <td className="px-3 py-2 text-right font-mono">{inr(l.total_value)}</td>
                  <td className="px-3 py-2">{l.delivery_date}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{l.cost_centre} / {l.gl_account}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold mb-3">Approval Timeline</h2>
        {(appr || []).length === 0 ? (
          <p className="text-sm text-slate-500">No approval actions yet.</p>
        ) : (
          <ol className="space-y-3">
            {(appr || []).map((a: any) => (
              <li key={a.id} className="text-sm border-l-2 pl-3 border-slate-200">
                <div><b>L{a.level}</b> · <Badge color={a.decision === "approve" ? "green" : a.decision === "reject" ? "red" : "yellow"}>{a.decision}</Badge> by {a.approver?.full_name || a.approver?.email}</div>
                {a.comment && <div className="text-slate-600 mt-1">"{a.comment}"</div>}
                <div className="text-xs text-slate-400 mt-1">{new Date(a.decided_at).toLocaleString("en-IN")}</div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
