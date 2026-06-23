import { supabase } from "@/integrations/supabase/client";
import { withOwner } from "@/lib/supabase/withOwner";
import { KNOWLEDGE_BASE, normalizeDrugName, type KBTemplate } from "@/lib/pharmacologyKnowledgeBase";
import { bestAlias, describeMatch, type AliasMatch } from "@/lib/pharmacology/aliasResolver";
import { toFormulationInserts, toSubstanceInsert } from "@/lib/pharmacology/templateImport";

export type SmartSubstanceResolution = {
  input: string;
  match: AliasMatch | null;
  template: KBTemplate | null;
  canonicalSubstance: any | null;
  duplicateSubstances: any[];
  message: string;
};

export function aliasesForTemplate(t: KBTemplate): string[] {
  return [
    t.name,
    t.generic_name,
    ...(t.match ?? []),
    ...(t.brand_names ?? []),
    ...(t.brands ?? []),
    ...(t.international_brand_names ?? []),
    ...(t.reference_names ?? []),
    ...(t.synonyms ?? []),
    ...(t.common_misspellings ?? []),
  ].filter(Boolean) as string[];
}

export function isSameCanonicalSubstance(substance: any, template: KBTemplate) {
  const sName = normalizeDrugName(substance?.name ?? "");
  const sGeneric = normalizeDrugName(substance?.generic_name ?? "");
  const key = normalizeDrugName(template.normalized_key ?? template.name);
  const canonical = normalizeDrugName(template.name);
  const generic = normalizeDrugName(template.generic_name ?? "");
  return sName === canonical || sName === key || (!!generic && sGeneric === generic);
}

export function findCanonicalSubstance(substances: any[], template: KBTemplate) {
  return substances.find((s) => isSameCanonicalSubstance(s, template)) ?? null;
}

export function findDuplicateAliasSubstances(substances: any[], template: KBTemplate) {
  const aliases = new Set(aliasesForTemplate(template).map(normalizeDrugName));
  const canonical = normalizeDrugName(template.name);
  return substances.filter((s) => {
    const n = normalizeDrugName(s?.name ?? "");
    if (!n || n === canonical) return false;
    return aliases.has(n);
  });
}

export function resolveSmartSubstance(input: string, substances: any[]): SmartSubstanceResolution {
  const match = bestAlias(input, 0.78);
  const template = match?.template ?? null;
  if (!template) {
    return {
      input,
      match: null,
      template: null,
      canonicalSubstance: null,
      duplicateSubstances: [],
      message: "Sem correspondência na base de conhecimento. Pode registrar manualmente, mas a previsão ficará menos confiável.",
    };
  }
  const canonical = findCanonicalSubstance(substances, template);
  const duplicates = findDuplicateAliasSubstances(substances, template);
  const base = describeMatch(match);
  const duplicateMsg = duplicates.length
    ? ` Existem ${duplicates.length} entrada(s) que parecem ser produto/alias do mesmo princípio ativo: ${duplicates.map((d) => d.name).join(", ")}. Prefira vincular ao canônico ${template.name}.`
    : "";
  return { input, match, template, canonicalSubstance: canonical, duplicateSubstances: duplicates, message: `${base}${duplicateMsg}` };
}

export async function ensureCanonicalSubstanceFromTemplate(template: KBTemplate, user: any, existingSubstances: any[] = []) {
  const existing = findCanonicalSubstance(existingSubstances, template);
  if (existing) return { substance: existing, created: false, formulationsCreated: 0 };
  const row = withOwner(toSubstanceInsert(template), user);
  const { data: substance, error } = await supabase.from("substances").insert(row as any).select().single();
  if (error) throw error;
  const forms = toFormulationInserts(template).map((fm) => withOwner({ ...fm, substance_id: substance.id }, user));
  let formulationsCreated = 0;
  if (forms.length) {
    const { error: fmError } = await (supabase as any).from("substance_formulations").insert(forms);
    if (fmError) throw fmError;
    formulationsCreated = forms.length;
  }
  return { substance, created: true, formulationsCreated };
}

export async function ensureCanonicalSubstanceFromInput(input: string, user: any, existingSubstances: any[] = []) {
  const resolution = resolveSmartSubstance(input, existingSubstances);
  if (!resolution.template) return { ...resolution, substance: null, created: false, formulationsCreated: 0 };
  const ensured = await ensureCanonicalSubstanceFromTemplate(resolution.template, user, existingSubstances);
  return { ...resolution, ...ensured };
}

export function displayMedicationName(med: any) {
  const brand = med?.brand_name || med?.free_text_name;
  const canonical = med?.substances?.name;
  if (brand && canonical && normalizeDrugName(brand) !== normalizeDrugName(canonical)) return `${brand} → ${canonical}`;
  return canonical || brand || "Medicação sem nome";
}

export function templateSummary(t: KBTemplate) {
  const aliases = aliasesForTemplate(t).slice(0, 8).join(", ");
  const curve = t.default_curve_model ?? t.formulations?.[0]?.curve_model ?? "curva não estruturada";
  return { aliases, curve };
}
