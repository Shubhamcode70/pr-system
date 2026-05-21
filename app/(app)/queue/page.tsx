import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Badge, Card, statusColor } from "@/components/ui";
import { inr } from "@/lib/inr";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const supabase = supabaseServer();
  const { data: prs } = await supabase
    .from("v_my_queue")
    .select("id, pr_number, purpose_of_procurement, pr_type, total_value, status, current_level, submitted_at, requester:app_users!purchase_requests_requester_id_fkey(email, full_name)")
    .order("submitted_at", { ascending: true });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Approval Queue</h1>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3">PR Number</th>
                <th className="text-left px-4 py-3">Requester</th>
                <th className="text-left px-4 py-3">Purpose</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-left px-4 py-3">Level</th>
                <th className="text-left px-4 py-3">Waiting since</th>
              </tr>
            </thead>
            <tbody>
              {(prs || []).map((pr: any) => (
                <tr key={pr.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium"><Link href={`/queue/${pr.id}`} className="text-brand-600 hover:underline">{pr.pr_number}</Link></td>
                  <td className="px-4 py-3">{pr.requester?.full_name || pr.requester?.email}</td>
                  <td className="px-4 py-3 max-w-md truncate">{pr.purpose_of_procurement}</td>
                  <td className="px-4 py-3">{pr.pr_type}</td>
                  <td className="px-4 py-3 text-right font-mono">{inr(pr.total_value)}</td>
                  <td className="px-4 py-3"><Badge color={statusColor(pr.status)}>L{pr.current_level}</Badge></td>
                  <td className="px-4 py-3 text-slate-500">{pr.submitted_at ? new Date(pr.submitted_at).toLocaleDateString("en-IN") : "—"}</td>
                </tr>
              ))}
              {(!prs || prs.length === 0) && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Nothing in your queue. </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
