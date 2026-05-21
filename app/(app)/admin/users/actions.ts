"use server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: me } = await supabase.from("app_users").select("is_admin").eq("id", user.id).maybeSingle();
  return me?.is_admin ? user : null;
}

export async function toggleAdmin(userId: string, value: boolean): Promise<{ ok: true } | { error: string }> {
  const me = await requireAdmin();
  if (!me) return { error: "Not admin" };
  const sb = supabaseAdmin();
  const { error } = await sb.from("app_users").update({ is_admin: value }).eq("id", userId);
  return error ? { error: error.message } : { ok: true };
}
export async function toggleActive(userId: string, value: boolean): Promise<{ ok: true } | { error: string }> {
  const me = await requireAdmin();
  if (!me) return { error: "Not admin" };
  const sb = supabaseAdmin();
  const { error } = await sb.from("app_users").update({ is_active: value }).eq("id", userId);
  return error ? { error: error.message } : { ok: true };
}
export async function toggleMembership(userId: string, groupId: string, value: boolean): Promise<{ ok: true } | { error: string }> {
  const me = await requireAdmin();
  if (!me) return { error: "Not admin" };
  const sb = supabaseAdmin();
  if (value) {
    const { error } = await sb.from("role_group_members").upsert({ user_id: userId, role_group_id: groupId });
    return error ? { error: error.message } : { ok: true };
  } else {
    const { error } = await sb.from("role_group_members").delete().eq("user_id", userId).eq("role_group_id", groupId);
    return error ? { error: error.message } : { ok: true };
  }
}
