"use client";
import { useState, useEffect } from "react";

const NOTES = [
  "All fields in this check sheet are mandatory for PR creation. Incomplete PRs will be rejected at the time of submission.",
  "For CAPEX PRs: CR ID and Asset Number must be provided and verified before the PR is submitted for approval.",
  "Single Vendor Justification is mandatory when only one supplier is being considered — attach a supporting document wherever available.",
  "Cost Centre and G/L Account must be validated with the Finance team before the PR is submitted.",
  "Incomplete or incorrectly filled PRs will be returned to the requisitioner for correction, leading to procurement delays."
];

const STORAGE_KEY = "pr-instructions-seen-v1";

export default function InstructionsPopup() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) setOpen(true);
    } catch {}
  }, []);

  function close() {
    setOpen(false);
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
  }

  if (!mounted) return null;

  return (
    <>
      {/* Floating button — always visible so user can re-open instructions */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open instructions"
        title="Open instructions"
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-brand-600 hover:bg-brand-700 text-white shadow-lg flex items-center justify-center text-xl font-bold"
      >
        ?
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="inst-title">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 id="inst-title" className="text-lg font-bold text-slate-800">Important Notes — Before You Submit</h2>
              <button onClick={close} aria-label="Close" className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-3 text-sm text-slate-700">
              <p className="text-slate-600">From the SAP PR Checksheet — please review these rules before creating a PR:</p>
              <ol className="space-y-3">
                {NOTES.map((n, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="pt-0.5">{n}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-5 p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 text-xs">
                <b>Tip:</b> Hover (or tap) the <span className="inline-flex w-4 h-4 rounded-full bg-slate-200 text-slate-600 text-[10px] items-center justify-center align-middle">?</span> icon next to any field for guidance on what to enter.
              </div>
            </div>
            <div className="sticky bottom-0 bg-slate-50 border-t px-6 py-3 flex justify-end gap-2">
              <button onClick={close} className="px-4 py-2 rounded-md bg-brand-600 text-white text-sm font-medium hover:bg-brand-700">Got it — let's create a PR</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
