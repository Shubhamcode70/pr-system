"use server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";

export async function createVendor(input: any): Promise<{ id: string } | { error: string }> {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: me } = await supabase.from("app_users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) return { error: "Admins only" };

  // Light validation (DB also enforces via CHECK constraints)
  if (!input.legal_name || !input.legal_name.trim()) return { error: "Legal Name is required" };
  if (input.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(input.gstin)) return { error: "GSTIN format invalid (15 chars)" };
  if (input.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(input.pan)) return { error: "PAN format invalid (10 chars)" };
  if (input.pincode && !/^[0-9]{6}$/.test(input.pincode)) return { error: "Pincode must be 6 digits" };
  if (input.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(input.ifsc)) return { error: "IFSC format invalid" };

  const sb = supabaseAdmin();
  const { data, error } = await sb.from("vendors").insert({
    legal_name: input.legal_name.trim(),
    trade_name: input.trade_name?.trim() || null,
    gstin: input.gstin?.trim() || null,
    pan: input.pan?.trim() || null,
    msme_registered: !!input.msme_registered,
    address_line1: input.address_line1?.trim() || null,
    address_line2: input.address_line2?.trim() || null,
    city: input.city?.trim() || null,
    state: input.state?.trim() || null,
    pincode: input.pincode?.trim() || null,
    country: input.country?.trim() || "India",
    contact_name: input.contact_name?.trim() || null,
    contact_email: input.contact_email?.trim() || null,
    contact_phone: input.contact_phone?.trim() || null,
    bank_name: input.bank_name?.trim() || null,
    account_no: input.account_no?.trim() || null,
    ifsc: input.ifsc?.trim() || null,
    payment_terms: input.payment_terms || "Net 30",
    currency: input.currency || "INR",
    notes: input.notes?.trim() || null,
    status: input.status === "draft" ? "draft" : "active",
    onboarded_by: user.id
  }).select("id").single();

  if (error) return { error: error.message };
  return { id: data!.id };
}

export async function updateVendorStatus(vendorId: string, status: "active" | "on_hold" | "blacklisted"): Promise<{ ok: true } | { error: string }> {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { data: me } = await supabase.from("app_users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) return { error: "Admins only" };

  const sb = supabaseAdmin();
  const { error } = await sb.from("vendors").update({ status }).eq("id", vendorId);
  return error ? { error: error.message } : { ok: true };
}
