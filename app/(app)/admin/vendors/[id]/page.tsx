import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui";
import VendorStatusActions from "./VendorStatusActions";

export const dynamic = "force-dynamic";

export default async function VendorDetail({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("app_users").select("is_admin").eq("id", user!.id).maybeSingle();
  if (!me?.is_admin) redirect("/dashboard");

  const { data: v } = await supabase.from("vendors").select("*").eq("id", params.id).maybeSingle();
  if (!v) return notFound();

  const colorMap: Record<string, "slate" | "green" | "yellow" | "red"> = {
    draft: "slate", active: "green", on_hold: "yellow", blacklisted: "red"
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{(v as any).legal_name}</h1>
          <p className="text-sm text-slate-500 font-mono">{(v as any).vendor_code}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge color={colorMap[(v as any).status] || "slate"}>{(v as any).status}</Badge>
          <Link href="/admin/vendors" className="text-sm text-brand-600 hover:underline">← Back</Link>
        </div>
      </div>

      <Card>
        <h2 className="font-semibold mb-3">Identity</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div><dt className="text-slate-500">Trade Name</dt><dd>{(v as any).trade_name || "—"}</dd></div>
          <div><dt className="text-slate-500">GSTIN</dt><dd className="font-mono">{(v as any).gstin || "—"}</dd></div>
          <div><dt className="text-slate-500">PAN</dt><dd className="font-mono">{(v as any).pan || "—"}</dd></div>
          <div><dt className="text-slate-500">MSME</dt><dd>{(v as any).msme_registered ? "Yes" : "No"}</dd></div>
        </dl>
      </Card>

      <Card>
        <h2 className="font-semibold mb-3">Address</h2>
        <p className="text-sm text-slate-700 whitespace-pre-line">
          {[(v as any).address_line1, (v as any).address_line2, (v as any).city, (v as any).state, (v as any).pincode, (v as any).country].filter(Boolean).join(", ") || "—"}
        </p>
      </Card>

      <Card>
        <h2 className="font-semibold mb-3">Contact</h2>
        <dl className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div><dt className="text-slate-500">Name</dt><dd>{(v as any).contact_name || "—"}</dd></div>
          <div><dt className="text-slate-500">Email</dt><dd>{(v as any).contact_email || "—"}</dd></div>
          <div><dt className="text-slate-500">Phone</dt><dd>{(v as any).contact_phone || "—"}</dd></div>
        </dl>
      </Card>

      <Card>
        <h2 className="font-semibold mb-3">Commercial</h2>
        <dl className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div><dt className="text-slate-500">Payment Terms</dt><dd>{(v as any).payment_terms}</dd></div>
          <div><dt className="text-slate-500">Currency</dt><dd>{(v as any).currency}</dd></div>
          <div><dt className="text-slate-500">Created</dt><dd>{new Date((v as any).created_at).toLocaleString("en-IN")}</dd></div>
        </dl>
        {(v as any).notes && <p className="mt-3 text-sm text-slate-600 italic">"{(v as any).notes}"</p>}
      </Card>

      <Card>
        <h2 className="font-semibold mb-3">Actions</h2>
        <VendorStatusActions vendorId={params.id} currentStatus={(v as any).status} />
      </Card>
    </div>
  );
}
