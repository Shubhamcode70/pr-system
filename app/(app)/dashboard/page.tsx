import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Badge, Button, Card, statusColor } from "@/components/ui";
import { inr } from "@/lib/inr";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: prs } = await supabase
    .from("purchase_requests")
    .select("id, pr_number, purpose_of_procurement, pr_type, total_value, status, current_level, created_at")
    .eq("requester_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My PRs</h1>
        <Link href="/pr/new"><Button>+ New PR</Button></Link>
      </div>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3">PR Number</th>
                <th className="text-left px-4 py-3">Purpose</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-right px-4 py-3">Total Value</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {(prs || []).map(pr => (
                <tr key={pr.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium"><Link href={`/pr/${pr.id}`} className="text-brand-600 hover:underline">{pr.pr_number}</Link></td>
                  <td className="px-4 py-3 max-w-md truncate">{pr.purpose_of_procurement}</td>
                  <td className="px-4 py-3">{pr.pr_type}</td>
                  <td className="px-4 py-3 text-right font-mono">{inr(pr.total_value)}</td>
                  <td className="px-4 py-3"><Badge color={statusColor(pr.status)}>{pr.status}{pr.current_level ? ` (L${pr.current_level})` : ""}</Badge></td>
                  <td className="px-4 py-3 text-slate-500">{new Date(pr.created_at).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
              {(!prs || prs.length === 0) && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No PRs yet. Click <Link className="text-brand-600 underline" href="/pr/new">New PR</Link> to create one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
