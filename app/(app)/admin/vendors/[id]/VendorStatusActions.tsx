"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { updateVendorStatus } from "../new/actions";

export default function VendorStatusActions({ vendorId, currentStatus }: { vendorId: string; currentStatus: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function setStatus(s: "active" | "on_hold" | "blacklisted") {
    setBusy(true); setMsg(null);
    const r = await updateVendorStatus(vendorId, s);
    setBusy(false);
    if ("ok" in r) { setMsg(`Status updated to ${s}.`); router.refresh(); }
    else setMsg(r.error);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {currentStatus !== "active" && <Button onClick={() => setStatus("active")} disabled={busy}>Activate</Button>}
      {currentStatus !== "on_hold" && <Button variant="secondary" onClick={() => setStatus("on_hold")} disabled={busy}>Put on Hold</Button>}
      {currentStatus !== "blacklisted" && <Button variant="danger" onClick={() => setStatus("blacklisted")} disabled={busy}>Blacklist</Button>}
      {msg && <span className="text-sm text-slate-600">{msg}</span>}
    </div>
  );
}
