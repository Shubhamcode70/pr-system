"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Button, Input, Label, Card } from "@/components/ui";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setBusy(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } }
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setMsg("Account created. You can now sign in.");
    setTimeout(() => router.replace("/login"), 1200);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-1">Create account</h1>
        <p className="text-sm text-slate-500 mb-6">PR System</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div><Label htmlFor="name" required>Full name</Label><Input id="name" required value={fullName} onChange={e => setFullName(e.target.value)} /></div>
          <div><Label htmlFor="email" required>Email</Label><Input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div><Label htmlFor="password" required>Password</Label><Input id="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} /></div>
          {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
          {msg && <p className="text-sm text-green-700">{msg}</p>}
          <Button type="submit" disabled={busy} className="w-full">{busy ? "Creating…" : "Create account"}</Button>
        </form>
        <p className="mt-6 text-sm text-slate-600">Have an account? <Link href="/login" className="text-brand-600 hover:underline">Sign in</Link></p>
      </Card>
    </main>
  );
}
