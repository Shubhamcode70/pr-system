"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Button, Input, Label, Card } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.replace(search.get("redirect") || "/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-1">Sign in</h1>
        <p className="text-sm text-slate-500 mb-6">PR System</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div><Label htmlFor="email" required>Email</Label><Input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div><Label htmlFor="password" required>Password</Label><Input id="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
          {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
          <Button type="submit" disabled={busy} className="w-full">{busy ? "Signing in…" : "Sign in"}</Button>
        </form>
        <p className="mt-6 text-sm text-slate-600">No account? <Link href="/signup" className="text-brand-600 hover:underline">Sign up</Link></p>
      </Card>
    </main>
  );
}
