import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("app_users").select("is_admin").eq("id", user!.id).maybeSingle();
  if (!me?.is_admin) redirect("/dashboard");

  const tiles = [
    { href: "/admin/users", title: "Users & Role Groups", body: "Manage users, assign role groups, promote admins." },
    { href: "/admin/vendors", title: "Vendors", body: "Vendor master — GSTIN, PAN, MSME, banking, payment terms." },
    { href: "/admin/rules", title: "Approval Rules", body: "Amount-based, up to 5 levels. Configurable per range." },
    { href: "/admin/master", title: "Master Data", body: "UoM, Material Groups, Plants, Cost Centres, G/L Accounts, etc." },
    { href: "/admin/audit", title: "Audit Log", body: "Every create, update, delete, and approval action." },
    { href: "/api/export", title: "Excel Export", body: "Download a workbook of all PRs, line items, and approvals." }
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Administration</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map(t => (
          <Link key={t.href} href={t.href}>
            <Card className="hover:border-brand-500 transition cursor-pointer h-full">
              <h2 className="font-semibold mb-1">{t.title}</h2>
              <p className="text-sm text-slate-600">{t.body}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
