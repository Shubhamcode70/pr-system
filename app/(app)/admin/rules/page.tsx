import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { inr } from "@/lib/inr";

export const dynamic = "force-dynamic";

export default async function ApprovalRulesPage() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("app_users").select("is_admin").eq("id", user!.id).maybeSingle();
  if (!me?.is_admin) redirect("/dashboard");

  const { data: rules } = await supabase
    .from("approval_rules")
    .select("*, l1:role_groups!approval_rules_level_1_group_id_fkey(name), l2:role_groups!approval_rules_level_2_group_id_fkey(name), l3:role_groups!approval_rules_level_3_group_id_fkey(name), l4:role_groups!approval_rules_level_4_group_id_fkey(name), l5:role_groups!approval_rules_level_5_group_id_fkey(name)")
    .order("min_amount");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Approval Rules</h1>
      <p className="text-sm text-slate-600">Phase 1: rules are seeded from <code>supabase/seed.sql</code> and edited in the Supabase Table Editor. A UI editor will come in Phase 2.</p>
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr>
            <th className="text-left px-3 py-2">Min</th>
            <th className="text-left px-3 py-2">Max</th>
            <th className="text-left px-3 py-2">L1</th>
            <th className="text-left px-3 py-2">L2</th>
            <th className="text-left px-3 py-2">L3</th>
            <th className="text-left px-3 py-2">L4</th>
            <th className="text-left px-3 py-2">L5</th>
            <th className="text-left px-3 py-2">Active</th>
          </tr></thead>
          <tbody>
            {(rules || []).map((r: any) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{inr(r.min_amount)}</td>
                <td className="px-3 py-2">{r.max_amount === null ? "∞" : inr(r.max_amount)}</td>
                <td className="px-3 py-2">{r.l1?.name || "—"}</td>
                <td className="px-3 py-2">{r.l2?.name || "—"}</td>
                <td className="px-3 py-2">{r.l3?.name || "—"}</td>
                <td className="px-3 py-2">{r.l4?.name || "—"}</td>
                <td className="px-3 py-2">{r.l5?.name || "—"}</td>
                <td className="px-3 py-2">{r.is_active ? "✅" : "❌"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
