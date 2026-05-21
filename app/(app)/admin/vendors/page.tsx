import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Badge, Button, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function VendorsList() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("app_users").select("is_admin").eq("id", user!.id).maybeSingle();
  if (!me?.is_admin) redirect("/dashboard");

  const { data: vendors } = await supabase
    .from("vendors")
    .select("id, vendor_code, legal_name, gstin, status, payment_terms, created_at")
    .order("created_at", { ascending: false });

  const statusColor: Record<string, "slate" | "green" | "yellow" | "red"> = {
    draft: "slate", active: "green", on_hold: "yellow", blacklisted: "red"
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vendors</h1>
        <Link href="/admin/vendors/new"><Button>+ Add Vendor</Button></Link>
      </div>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">Code</th>
                <th className="text-left px-3 py-2">Legal Name</th>
                <th className="text-left px-3 py-2">GSTIN</th>
                <th className="text-left px-3 py-2">Payment</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Added</th>
              </tr>
            </thead>
            <tbody>
              {(vendors || []).map((v: any) => (
                <tr key={v.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono"><Link href={`/admin/vendors/${v.id}`} className="text-brand-600 hover:underline">{v.vendor_code}</Link></td>
                  <td className="px-3 py-2">{v.legal_name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{v.gstin || "—"}</td>
                  <td className="px-3 py-2">{v.payment_terms}</td>
                  <td className="px-3 py-2"><Badge color={statusColor[v.status] || "slate"}>{v.status}</Badge></td>
                  <td className="px-3 py-2 text-slate-500 text-xs">{new Date(v.created_at).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
              {(!vendors || vendors.length === 0) && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  No vendors yet. <Link href="/admin/vendors/new" className="text-brand-600 underline">Add the first one</Link>.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
