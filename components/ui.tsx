// Minimal UI kit (Button, Input, Select, Card, Badge, etc.) — keeps the project lean.
import React from "react";

export function Button({ className = "", variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const styles: Record<string, string> = {
    primary: "bg-brand-600 hover:bg-brand-700 text-white",
    secondary: "bg-white border border-slate-300 hover:bg-slate-50 text-slate-800",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    ghost: "hover:bg-slate-100 text-slate-700"
  };
  return <button {...props} className={`inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${props.className || ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${props.className || ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${props.className || ""}`} />;
}

export function Label({ children, htmlFor, required }: { children: React.ReactNode; htmlFor?: string; required?: boolean }) {
  return <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 mb-1">
    {children}{required && <span className="text-red-500" aria-hidden> *</span>}
  </label>;
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-lg border border-slate-200 p-6 ${className}`}>{children}</div>;
}

export function Badge({ children, color = "slate" }: { children: React.ReactNode; color?: "slate" | "green" | "red" | "yellow" | "blue" }) {
  const map: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    yellow: "bg-yellow-100 text-yellow-800",
    blue: "bg-blue-100 text-blue-700"
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[color]}`}>{children}</span>;
}

export function statusColor(status: string): "slate" | "green" | "red" | "yellow" | "blue" {
  if (status === "approved") return "green";
  if (status === "rejected" || status === "withdrawn") return "red";
  if (status === "reverted") return "yellow";
  if (status.startsWith("pending")) return "blue";
  return "slate";
}
