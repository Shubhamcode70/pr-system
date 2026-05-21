import { supabaseServer } from "@/lib/supabase/server";
import NewPRClient from "./NewPRClient";

export const dynamic = "force-dynamic";

export default async function NewPRPage() {
  const supabase = supabaseServer();
  const [uoms, mgs, plants, pgs, ccs, gls, crs, assets] = await Promise.all([
    supabase.from("uom_master").select("code, description").eq("is_active", true).order("code"),
    supabase.from("material_group_master").select("code, name").eq("is_active", true).order("code"),
    supabase.from("plant_master").select("code, name").eq("is_active", true).order("code"),
    supabase.from("purchasing_group_master").select("code, name").eq("is_active", true).order("code"),
    supabase.from("cost_centre_master").select("code, name").eq("is_active", true).order("code"),
    supabase.from("gl_account_master").select("code, name, expense_type").eq("is_active", true).order("code"),
    supabase.from("capex_request_master").select("cr_id, title").eq("is_active", true).order("cr_id"),
    supabase.from("asset_master").select("asset_no, description, cr_id").eq("is_active", true).order("asset_no")
  ]);

  return <NewPRClient masters={{
    uoms: uoms.data || [], mgs: mgs.data || [], plants: plants.data || [],
    pgs: pgs.data || [], ccs: ccs.data || [], gls: gls.data || [],
    crs: crs.data || [], assets: assets.data || []
  }} />;
}
