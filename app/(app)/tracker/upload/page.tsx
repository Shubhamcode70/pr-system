import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import UploadForm from "./UploadForm";

export const dynamic = "force-dynamic";

export default async function TrackerUploadPage() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("app_users").select("is_admin").eq("id", user!.id).maybeSingle();
  if (!me?.is_admin) redirect("/tracker");

  const { data: batches } = await supabase
    .from("sap_import_batches")
    .select("id, filename, uploaded_at, status, row_counts")
    .order("uploaded_at", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Upload SAP Excel</h1>
          <p className="text-sm text-slate-500">Replaces the active dataset. The Excel must have sheets: <code>PR where pending</code>, <code>PR Cost Center</code>, <code>Approval Matrix</code>.</p>
        </div>
        <Link href="/tracker" className="text-sm text-brand-600 hover:underline">← Back to Tracker</Link>
      </div>

      <Card>
        <UploadForm />
      </Card>

      <Card className="p-0 overflow-hidden">
        <h2 className="font-semibold p-4 border-b">Recent uploads</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr><th className="text-left px-3 py-2">Filename</th><th className="text-left px-3 py-2">When</th><th className="text-left px-3 py-2">Status</th><th className="text-right px-3 py-2">Rows</th></tr>
            </thead>
            <tbody>
              {(batches || []).map((b: any) => (
                <tr key={b.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{b.filename}</td>
                  <td className="px-3 py-2 text-slate-600">{new Date(b.uploaded_at).toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2">{b.status === "active" ? <span className="text-green-700">active</span> : <span className="text-slate-500">superseded</span>}</td>
                  <td className="px-3 py-2 text-right text-xs text-slate-500">
                    {b.row_counts?.pending || 0} / {b.row_counts?.cost_centre || 0} / {b.row_counts?.matrix || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
