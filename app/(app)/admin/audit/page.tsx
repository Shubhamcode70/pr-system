import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("app_users").select("is_admin").eq("id", user!.id).maybeSingle();
  if (!me?.is_admin) redirect("/dashboard");

  const { data: rows } = await supabase
    .from("audit_log")
    .select("id, created_at, entity_type, entity_id, action, actor_id, actor:app_users!audit_log_actor_id_fkey(email)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Log</h1>
      <p className="text-sm text-slate-600">Showing the most recent 200 entries. Use Supabase Table Editor for full filtering and export.</p>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr><th className="text-left px-3 py-2">When</th><th className="text-left px-3 py-2">Actor</th><th className="text-left px-3 py-2">Action</th><th className="text-left px-3 py-2">Entity</th><th className="text-left px-3 py-2">Entity ID</th></tr>
            </thead>
            <tbody>
              {(rows || []).map((r: any) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-xs text-slate-500">{new Date(r.created_at).toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2">{r.actor?.email || "—"}</td>
                  <td className="px-3 py-2"><Badge color={r.action === "create" ? "blue" : r.action === "update" ? "yellow" : r.action === "delete" ? "red" : "slate"}>{r.action}</Badge></td>
                  <td className="px-3 py-2">{r.entity_type}</td>
                  <td className="px-3 py-2 text-xs font-mono">{r.entity_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
