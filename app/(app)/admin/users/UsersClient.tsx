"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { toggleAdmin, toggleActive, toggleMembership } from "./actions";

export default function UsersClient({ users, groups, members }: {
  users: { id: string; email: string; full_name: string; is_admin: boolean; is_active: boolean }[];
  groups: { id: string; name: string }[];
  members: { role_group_id: string; user_id: string }[];
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function isMember(userId: string, groupId: string) {
    return members.some(m => m.user_id === userId && m.role_group_id === groupId);
  }

  return (
    <div className="overflow-x-auto">
      {msg && <p className="text-sm text-green-700 mb-2">{msg}</p>}
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left px-3 py-2">User</th>
            <th className="text-left px-3 py-2">Admin</th>
            <th className="text-left px-3 py-2">Active</th>
            {groups.map(g => <th key={g.id} className="text-left px-3 py-2">{g.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className="border-t border-slate-100">
              <td className="px-3 py-2"><div className="font-medium">{u.full_name || "—"}</div><div className="text-xs text-slate-500">{u.email}</div></td>
              <td className="px-3 py-2"><input type="checkbox" checked={u.is_admin} disabled={pending} onChange={() => start(async () => { const r = await toggleAdmin(u.id, !u.is_admin); setMsg(r.ok ? "Saved." : r.error || "Failed"); })} /></td>
              <td className="px-3 py-2"><input type="checkbox" checked={u.is_active} disabled={pending} onChange={() => start(async () => { const r = await toggleActive(u.id, !u.is_active); setMsg(r.ok ? "Saved." : r.error || "Failed"); })} /></td>
              {groups.map(g => (
                <td key={g.id} className="px-3 py-2">
                  <input type="checkbox" checked={isMember(u.id, g.id)} disabled={pending} onChange={(e) => start(async () => { const r = await toggleMembership(u.id, g.id, e.target.checked); setMsg(r.ok ? "Saved." : r.error || "Failed"); })} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-slate-500 mt-3">Tip: Refresh the page after edits to see the updated state.</p>
    </div>
  );
}
