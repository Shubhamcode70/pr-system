"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function TopNav({ email, isAdmin }: { email: string; isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await supabaseBrowser().auth.signOut();
    router.replace("/login");
  }

  const link = (href: string, label: string) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return <Link href={href} className={`px-3 py-2 rounded-md text-sm font-medium ${active ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-100"}`}>{label}</Link>;
  };

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="text-lg font-bold text-brand-700">PR System</Link>
          <nav className="ml-6 hidden sm:flex gap-1">
            {link("/dashboard", "My PRs")}
            {link("/pr/new", "New PR")}
            {link("/queue", "Approval Queue")}
            {link("/tracker", "Tracker")}
            {isAdmin && link("/admin", "Admin")}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-sm text-slate-600">{email}</span>
          <button onClick={logout} className="text-sm text-slate-700 hover:text-red-600 font-medium">Sign out</button>
        </div>
      </div>
      <nav className="sm:hidden border-t border-slate-200 flex justify-around py-1">
        {link("/dashboard", "PRs")}
        {link("/pr/new", "New")}
        {link("/queue", "Queue")}
        {link("/tracker", "Tracker")}
        {isAdmin && link("/admin", "Admin")}
      </nav>
    </header>
  );
}
