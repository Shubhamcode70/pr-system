import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

const tables = [
  { name: "UoM", table: "uom_master" },
  { name: "Material Groups", table: "material_group_master" },
  { name: "Plants", table: "plant_master" },
  { name: "Purchasing Groups", table: "purchasing_group_master" },
  { name: "Cost Centres", table: "cost_centre_master" },
  { name: "G/L Accounts", table: "gl_account_master" },
  { name: "Capex Requests", table: "capex_request_master" },
  { name: "Assets", table: "asset_master" }
];

export default async function MasterDataHome() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("app_users").select("is_admin").eq("id", user!.id).maybeSingle();
  if (!me?.is_admin) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Master Data</h1>
      <p className="text-sm text-slate-600">Phase 1: master data is managed via the Supabase Table Editor. A UI editor will come in Phase 2. Below are direct links to the Supabase tables.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map(t => (
          <Card key={t.table}>
            <h2 className="font-semibold">{t.name}</h2>
            <p className="text-sm text-slate-500 mb-3">Table: <code>{t.table}</code></p>
            <a href={`https://supabase.com/dashboard/project/_/editor`} target="_blank" rel="noreferrer" className="text-brand-600 text-sm hover:underline">Open in Supabase →</a>
          </Card>
        ))}
      </div>
      <Link href="/admin" className="text-sm text-brand-600 hover:underline">← Back to Admin</Link>
    </div>
  );
}
