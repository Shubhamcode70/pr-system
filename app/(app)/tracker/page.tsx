import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import TrackerSearch from "./TrackerSearch";

export const dynamic = "force-dynamic";

export default async function TrackerPage() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("app_users").select("is_admin").eq("id", user!.id).maybeSingle();
  const { data: batch } = await supabase
    .from("sap_import_batches")
    .select("id, filename, uploaded_at, row_counts")
    .eq("status", "active")
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">SAP PR Tracker</h1>
          <p className="text-sm text-slate-500">Search PRs imported from your SAP Excel export.</p>
        </div>
        {me?.is_admin && (
          <Link href="/tracker/upload" className="text-sm text-brand-600 hover:underline">Admin: Upload Excel →</Link>
        )}
      </div>

      {batch ? (
        <Card>
          <div className="text-sm text-slate-600">
            Active dataset: <b>{batch.filename}</b>{" "}
            <span className="text-slate-400">uploaded {new Date(batch.uploaded_at).toLocaleString("en-IN")}</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {batch.row_counts?.pending ?? 0} PR rows · {batch.row_counts?.cost_centre ?? 0} cost-centre rows · {batch.row_counts?.matrix ?? 0} matrix rows
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-amber-700">
            No SAP data loaded yet. {me?.is_admin
              ? <Link href="/tracker/upload" className="text-brand-600 underline">Upload the SAP Excel</Link>
              : "Ask an admin to upload the SAP Excel."}
          </p>
        </Card>
      )}

      <TrackerSearch hasData={!!batch} />
    </div>
  );
}
