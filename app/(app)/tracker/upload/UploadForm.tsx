"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";

export default function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setErr("Choose an Excel file."); return; }
    setErr(null); setMsg(null); setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await fetch("/api/tracker/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || `HTTP ${r.status}`); setBusy(false); return; }
      setMsg(`Loaded: ${j.counts.pending} PR rows, ${j.counts.cost_centre} cost-centre rows, ${j.counts.matrix} matrix rows.`);
      setFile(null);
      setBusy(false);
      router.refresh();
    } catch (e: any) {
      setErr(e.message || "Upload failed");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input type="file" accept=".xlsx,.xls" onChange={e => setFile(e.target.files?.[0] || null)} />
      <Button type="submit" disabled={busy || !file}>{busy ? "Parsing & loading…" : "Upload"}</Button>
      {msg && <p className="text-sm text-green-700">{msg}</p>}
      {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
    </form>
  );
}
