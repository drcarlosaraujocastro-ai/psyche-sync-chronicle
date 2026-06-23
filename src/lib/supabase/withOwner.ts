import type { User } from "@supabase/supabase-js";

export class NotAuthenticatedError extends Error {
  constructor() {
    super("Você precisa estar autenticado para salvar dados clínicos.");
    this.name = "NotAuthenticatedError";
  }
}

/**
 * Anexa `owner_id = user.id` ao payload e bloqueia inserts anônimos.
 * Usar em todo INSERT clínico para impedir registros órfãos.
 */
export function withOwner<T extends Record<string, any>>(payload: T, user: User | null | undefined): T & { owner_id: string } {
  if (!user?.id) throw new NotAuthenticatedError();
  return { ...payload, owner_id: user.id };
}

export function withOwnerMany<T extends Record<string, any>>(payloads: T[], user: User | null | undefined): (T & { owner_id: string })[] {
  if (!user?.id) throw new NotAuthenticatedError();
  return payloads.map((p) => ({ ...p, owner_id: user.id }));
}