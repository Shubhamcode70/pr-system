"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Textarea } from "@/components/ui";
import { decide } from "./actions";

export default function ApproveActions({ prId }: { prId: string }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function act(decision: "approve" | "reject" | "revert") {
    if (decision !== "approve" && comment.trim().length === 0) {
      setErr("Comment is required for reject / revert."); return;
    }
    setBusy(true); setErr(null);
    const res = await decide({ prId, decision, comment: comment.trim() || null });
    setBusy(false);
    if ("error" in res) { setErr(res.error); return; }
    router.push("/queue");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <Textarea rows={3} placeholder="Comment (required for reject / revert)" value={comment} onChange={e => setComment(e.target.value)} />
      {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => act("approve")} disabled={busy}>Approve</Button>
        <Button onClick={() => act("revert")} disabled={busy} variant="secondary">Revert (send back)</Button>
        <Button onClick={() => act("reject")} disabled={busy} variant="danger">Reject</Button>
      </div>
    </div>
  );
}
