import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

/**
 * Garante que existe uma linha em `profiles` para o usuário autenticado.
 * Nunca duplica, nunca sobrescreve campos existentes.
 */
export async function ensureProfile(user: User | null | undefined) {
  if (!user?.id) return null;
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) return existing;
  const display_name =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Profissional";
  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: user.id, display_name })
    .select()
    .maybeSingle();
  if (error && !String(error.message).toLowerCase().includes("duplicate")) {
    // não bloqueia o app — apenas registra
    console.warn("[ensureProfile]", error.message);
    return null;
  }
  return data;
}