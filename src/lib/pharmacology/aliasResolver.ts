/**
 * Alias resolver robusto.
 * Reconhece nomes comerciais brasileiros e internacionais, sinônimos genéricos,
 * erros de escrita e nomes parciais. Usa normalização sem acento + Levenshtein.
 */
import type { KBTemplate } from "@/lib/pharmacologyKnowledgeBase";
import { getRuntimeKnowledgeBase } from "@/lib/pharmacology/runtimeKnowledge";

export interface AliasMatch {
  template: KBTemplate;
  matchedAlias: string;
  matchedField: "name" | "generic_name" | "brand_names" | "brands" | "international_brand_names" | "reference_names" | "match" | "common_misspellings" | "synonyms" | "fuzzy";
  score: number;
  confidence: "high" | "medium" | "low";
  reason: string;
}

export function normalize(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => i);
  for (let j = 1; j <= n; j++) {
    let prev = dp[0]; dp[0] = j;
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i];
      dp[i] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[i], dp[i - 1]);
      prev = tmp;
    }
  }
  return dp[m];
}

function similarity(a: string, b: string): number {
  const A = normalize(a), B = normalize(b);
  if (!A || !B) return 0;
  if (A === B) return 1;
  const d = levenshtein(A, B);
  const L = Math.max(A.length, B.length);
  return 1 - d / L;
}

function tokensOf(t: KBTemplate): { value: string; field: AliasMatch["matchedField"] }[] {
  const out: { value: string; field: AliasMatch["matchedField"] }[] = [];
  if (t.name) out.push({ value: t.name, field: "name" });
  if (t.generic_name) out.push({ value: t.generic_name, field: "generic_name" });
  (t.brand_names ?? []).forEach((v) => out.push({ value: v, field: "brand_names" }));
  (t.brands ?? []).forEach((v) => out.push({ value: v, field: "brands" }));
  (t.international_brand_names ?? []).forEach((v) => out.push({ value: v, field: "international_brand_names" }));
  (t.reference_names ?? []).forEach((v) => out.push({ value: v, field: "reference_names" }));
  (t.match ?? []).forEach((v) => out.push({ value: v, field: "match" }));
  (t.synonyms ?? []).forEach((v) => out.push({ value: v, field: "synonyms" }));
  (t.common_misspellings ?? []).forEach((v) => out.push({ value: v, field: "common_misspellings" }));
  return out;
}

export function resolveAlias(query: string, limit = 5): AliasMatch[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const matches: AliasMatch[] = [];
  for (const t of getRuntimeKnowledgeBase()) {
    let best: AliasMatch | null = null;
    for (const tok of tokensOf(t)) {
      const n = normalize(tok.value);
      if (!n) continue;
      let score = 0;
      let reason = "";
      if (n === q) { score = 1; reason = "match exato"; }
      else if (n.length >= 3 && (n.startsWith(q) || q.startsWith(n))) { score = 0.92; reason = "prefixo"; }
      else if (n.length >= 4 && (n.includes(q) || q.includes(n))) { score = 0.85; reason = "contém"; }
      else {
        const sim = similarity(q, n);
        if (sim >= 0.78) { score = sim; reason = `fuzzy ${(sim * 100).toFixed(0)}%`; }
      }
      if (score > 0 && (!best || score > best.score)) {
        best = {
          template: t,
          matchedAlias: tok.value,
          matchedField: tok.field,
          score,
          confidence: score >= 0.95 ? "high" : score >= 0.85 ? "medium" : "low",
          reason,
        };
      }
    }
    if (best) matches.push(best);
  }
  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, limit);
}

export function bestAlias(query: string, threshold = 0.8): AliasMatch | null {
  const [first] = resolveAlias(query, 1);
  return first && first.score >= threshold ? first : null;
}

export function describeMatch(m: AliasMatch): string {
  const t = m.template;
  const fieldLabel: Record<AliasMatch["matchedField"], string> = {
    name: "nome canônico",
    generic_name: "nome genérico",
    brand_names: "nome comercial",
    brands: "nome comercial",
    international_brand_names: "nome comercial internacional",
    reference_names: "nome de referência",
    match: "alias conhecido",
    common_misspellings: "erro comum de escrita",
    synonyms: "sinônimo",
    fuzzy: "aproximação",
  };
  return `${m.matchedAlias} reconhecido como ${t.name} (${fieldLabel[m.matchedField]}, ${m.reason}).`;
}
