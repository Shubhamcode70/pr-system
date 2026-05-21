import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import VendorForm from "./VendorForm";

export const dynamic = "force-dynamic";

export default async function NewVendorPage() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("app_users").select("is_admin").eq("id", user!.id).maybeSingle();
  if (!me?.is_admin) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">New Vendor</h1>
        <Link href="/admin/vendors" className="text-sm text-brand-600 hover:underline">← Back to Vendors</Link>
      </div>
      <Card>
        <VendorForm />
      </Card>
    </div>
  );
}
