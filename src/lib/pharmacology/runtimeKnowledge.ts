import { KNOWLEDGE_BASE, type KBTemplate } from "@/lib/pharmacologyKnowledgeBase";
import { EXPANDED_KNOWLEDGE_TEMPLATES } from "@/lib/pharmacology/expandedKnowledgeBase";

const STORAGE_KEY = "psiconorte-runtime-knowledge-v2";

function normalizeLocal(s: any): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type KnowledgePack = {
  version?: string;
  name?: string;
  description?: string;
  templates?: KBTemplate[];
};

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function getBuiltInKnowledgeBase(): KBTemplate[] {
  return mergeTemplates([...KNOWLEDGE_BASE, ...EXPANDED_KNOWLEDGE_TEMPLATES]);
}

export function getImportedKnowledgePack(): KnowledgePack {
  if (!canUseStorage()) return { templates: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { templates: [] };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { templates: parsed };
    return { ...parsed, templates: Array.isArray(parsed?.templates) ? parsed.templates : [] };
  } catch {
    return { templates: [] };
  }
}

export function getRuntimeKnowledgeBase(): KBTemplate[] {
  return mergeTemplates([...getBuiltInKnowledgeBase(), ...(getImportedKnowledgePack().templates ?? [])]);
}

export function saveImportedKnowledgePack(pack: KnowledgePack) {
  if (!canUseStorage()) return;
  const clean = validateKnowledgePack(pack);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
}

export function appendImportedTemplates(templates: KBTemplate[]) {
  const current = getImportedKnowledgePack();
  saveImportedKnowledgePack({
    ...current,
    version: current.version ?? "runtime",
    name: current.name ?? "Conhecimento local importado",
    templates: mergeTemplates([...(current.templates ?? []), ...templates]),
  });
}

export function clearImportedKnowledgePack() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function validateKnowledgePack(pack: KnowledgePack): KnowledgePack {
  const templates = (pack.templates ?? [])
    .filter((t: any) => t && typeof t.name === "string" && t.name.trim().length > 1)
    .map((t: any) => ({
      ...t,
      name: String(t.name).trim(),
      normalized_key: t.normalized_key ?? normalizeLocal(t.name).replace(/\s+/g, "_"),
      requires_clinical_review: true,
      needs_review: true,
      source_notes: t.source_notes ?? "Template importado pelo usuário. Revisão clínica obrigatória.",
    })) as KBTemplate[];
  return {
    version: pack.version ?? "runtime",
    name: pack.name ?? "Knowledge Pack importado",
    description: pack.description,
    templates: mergeTemplates(templates),
  };
}

export function mergeTemplates(templates: KBTemplate[]): KBTemplate[] {
  const map = new Map<string, KBTemplate>();
  for (const t of templates) {
    if (!t?.name) continue;
    const key = normalizeLocal(t.normalized_key ?? t.name).replace(/\s+/g, "_");
    const previous = map.get(key);
    if (!previous) {
      map.set(key, t);
      continue;
    }
    map.set(key, {
      ...previous,
      ...t,
      match: uniq([...(previous.match ?? []), ...(t.match ?? [])]),
      brand_names: uniq([...(previous.brand_names ?? []), ...(t.brand_names ?? [])]),
      brands: uniq([...(previous.brands ?? []), ...(t.brands ?? [])]),
      international_brand_names: uniq([...(previous.international_brand_names ?? []), ...(t.international_brand_names ?? [])]),
      synonyms: uniq([...(previous.synonyms ?? []), ...(t.synonyms ?? [])]),
      common_misspellings: uniq([...(previous.common_misspellings ?? []), ...(t.common_misspellings ?? [])]),
      formulations: mergeFormulations([...(previous.formulations ?? []), ...(t.formulations ?? [])]),
    });
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function mergeFormulations(forms: any[]) {
  const map = new Map<string, any>();
  for (const f of forms) {
    const key = normalizeLocal(f?.formulation_name ?? f?.curve_model ?? "formulacao");
    if (!map.has(key)) map.set(key, f);
    else map.set(key, { ...map.get(key), ...f });
  }
  return Array.from(map.values());
}

function uniq(xs: any[]) {
  return Array.from(new Set(xs.filter(Boolean).map((x) => String(x))));
}

export function buildExportableKnowledgePack(): KnowledgePack {
  return {
    version: "2.0",
    name: "PsicoNorte Knowledge Pack",
    description: "Templates farmacológicos estruturais para apoio clínico, aliases, PK/PD, formulações, interações e harm reduction. Não prescreve e exige revisão clínica.",
    templates: getRuntimeKnowledgeBase(),
  };
}

export function knowledgeDiagnostics(templates = getRuntimeKnowledgeBase()) {
  const aliases = templates.reduce((acc, t) => acc + [t.name, t.generic_name, ...(t.match ?? []), ...(t.brand_names ?? []), ...(t.synonyms ?? [])].filter(Boolean).length, 0);
  const harmReduction = templates.filter((t) => t.source_type === "harm reduction" || t.substance_type === "substância recreativa").length;
  const withFormulations = templates.filter((t) => (t.formulations ?? []).length > 0 || t.default_formulation).length;
  const withCyp = templates.filter((t) => (t.cyp_substrate ?? []).length || (t.cyp_inhibitor ?? []).length || (t.cyp_inducer ?? []).length).length;
  return { total: templates.length, aliases, harmReduction, withFormulations, withCyp, imported: getImportedKnowledgePack().templates?.length ?? 0 };
}
