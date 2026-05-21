import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import TopNav from "@/components/TopNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("app_users")
    .select("email, is_admin, full_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="min-h-screen">
      <TopNav email={me?.email || user.email || ""} isAdmin={!!me?.is_admin} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
