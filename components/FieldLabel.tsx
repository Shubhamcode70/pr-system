"use client";
import { useState, useRef, useEffect } from "react";
import { fieldHelp, type FieldKey } from "@/lib/field-help";

export function FieldLabel({ htmlFor, children, required, helpKey }: { htmlFor?: string; children: React.ReactNode; required?: boolean; helpKey?: FieldKey }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="flex items-center gap-1.5 mb-1 relative" ref={ref}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {children}{required && <span className="text-red-500" aria-hidden> *</span>}
      </label>
      {helpKey && (
        <>
          <button type="button" onClick={() => setOpen(o => !o)} aria-label={`Help for ${children}`} className="text-slate-400 hover:text-brand-600 transition-colors" tabIndex={0}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </button>
          {open && (
            <div role="tooltip" className="absolute left-0 top-full mt-1 z-30 w-72 bg-slate-900 text-white text-xs rounded-md p-3 shadow-lg leading-relaxed">
              {fieldHelp[helpKey]}
            </div>
          )}
        </>
      )}
    </div>
  );
}
