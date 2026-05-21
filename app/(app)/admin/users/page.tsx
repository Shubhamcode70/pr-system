import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import UsersClient from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function AdminUsers() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("app_users").select("is_admin").eq("id", user!.id).maybeSingle();
  if (!me?.is_admin) redirect("/dashboard");

  const [users, groups, members] = await Promise.all([
    supabase.from("app_users").select("id, email, full_name, is_admin, is_active").order("email"),
    supabase.from("role_groups").select("id, name").order("name"),
    supabase.from("role_group_members").select("role_group_id, user_id")
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Users & Role Groups</h1>
      <Card>
        <UsersClient users={users.data || []} groups={groups.data || []} members={members.data || []} />
      </Card>
    </div>
  );
}
