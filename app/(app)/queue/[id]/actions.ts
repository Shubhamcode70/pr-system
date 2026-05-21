"use server";
import { supabaseServer } from "@/lib/supabase/server";
import { sendEmail, emailTemplate } from "@/lib/email";

export async function decide(input: { prId: string; decision: "approve" | "reject" | "revert"; comment: string | null; }) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: pr } = await supabase
    .from("purchase_requests")
    .select("*, requester:app_users!purchase_requests_requester_id_fkey(email, full_name)")
    .eq("id", input.prId).single();
  if (!pr) return { error: "PR not found" };
  const status = (pr as any).status as string;
  if (!status.startsWith("pending_")) return { error: "PR is not pending approval" };

  const level: number = (pr as any).current_level;

  const { error: apprErr } = await supabase.from("pr_approvals").insert({
    pr_id: input.prId,
    level,
    approver_id: user.id,
    decision: input.decision,
    comment: input.comment
  });
  if (apprErr) return { error: apprErr.message };

  let newStatus: string;
  let newLevel: number | null = null;

  if (input.decision === "reject") {
    newStatus = "rejected";
  } else if (input.decision === "revert") {
    newStatus = "reverted";
  } else {
    const { data: rule } = await supabase.from("approval_rules").select("*").eq("id", (pr as any).approval_rule_id).single();
    const nextLevel = level + 1;
    const nextGroup = nextLevel <= 5 ? (rule as any)[`level_${nextLevel}_group_id`] : null;
    if (nextGroup && nextLevel <= 5) {
      newStatus = `pending_l${nextLevel}`;
      newLevel = nextLevel;
    } else {
      newStatus = "approved";
    }
  }

  const upd: any = { status: newStatus, current_level: newLevel };
  if (newStatus === "approved") upd.approved_at = new Date().toISOString();

  const { error: updErr } = await supabase.from("purchase_requests").update(upd).eq("id", input.prId);
  if (updErr) return { error: updErr.message };

  // Notifications
  const base = process.env.APP_URL || "";
  const prNum = (pr as any).pr_number;
  const requesterEmail = (pr as any).requester?.email;

  if (newStatus === "approved" && requesterEmail) {
    await sendEmail(requesterEmail, `[${prNum}] Approved`, emailTemplate({
      title: `${prNum} approved`,
      bodyHtml: `<p>Your Purchase Request has been fully approved.</p>`,
      actionHref: `${base}/pr/${input.prId}`, actionLabel: "View PR"
    }));
  } else if (newStatus === "rejected" && requesterEmail) {
    await sendEmail(requesterEmail, `[${prNum}] Rejected`, emailTemplate({
      title: `${prNum} rejected`,
      bodyHtml: `<p>Your PR was rejected at level ${level}.</p><p><b>Reason:</b> ${input.comment || "(none)"}</p>`,
      actionHref: `${base}/pr/${input.prId}`, actionLabel: "View PR"
    }));
  } else if (newStatus === "reverted" && requesterEmail) {
    await sendEmail(requesterEmail, `[${prNum}] Sent back`, emailTemplate({
      title: `${prNum} sent back for changes`,
      bodyHtml: `<p>An approver sent your PR back. Please review and resubmit.</p><p><b>Comment:</b> ${input.comment || "(none)"}</p>`,
      actionHref: `${base}/pr/${input.prId}`, actionLabel: "View PR"
    }));
  } else if (newStatus.startsWith("pending_") && newLevel) {
    // Notify next-level approvers
    const { data: rule } = await supabase.from("approval_rules").select("*").eq("id", (pr as any).approval_rule_id).single();
    const groupId = (rule as any)[`level_${newLevel}_group_id`];
    if (groupId) {
      const { data: members } = await supabase
        .from("role_group_members").select("user_id, app_users:app_users!inner(email)").eq("role_group_id", groupId);
      const emails = (members || []).map((m: any) => m.app_users.email).filter(Boolean);
      if (emails.length > 0) {
        await sendEmail(emails, `[${prNum}] Approval requested`, emailTemplate({
          title: `${prNum} awaiting your approval (Level ${newLevel})`,
          bodyHtml: `<p>A PR has reached your level for review.</p>`,
          actionHref: `${base}/queue/${input.prId}`, actionLabel: "Review PR"
        }));
      }
    }
  }

  return { ok: true };
}
