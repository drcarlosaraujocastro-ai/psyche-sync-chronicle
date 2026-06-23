import { buildSubstanceCurve, type AdvDoseLog, type AdvSubstance } from "@/lib/curveEngine";

export type ForecastSeverity = "info" | "warn" | "high";

export interface ForecastItem {
  title: string;
  severity: ForecastSeverity;
  message: string;
  action?: string;
}

export interface AxisForecastPoint {
  axis: string;
  now: number;
  next6h: number;
  direction: "subindo" | "estável" | "caindo";
}

export interface StockAlert {
  medicationName: string;
  remaining: number | null;
  unit: string;
  daysRemaining: number | null;
  severity: ForecastSeverity;
  message: string;
}

export interface MedicationForecastInput {
  patient?: any;
  session?: any;
  medications?: any[];
  doses?: AdvDoseLog[];
  substances?: AdvSubstance[];
  formulations?: any[];
  checkins?: any[];
  responseProfiles?: any[];
  inventory?: any[];
  now?: Date;
}

function asNumber(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function norm(s: any) {
  return String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function findSubstance(name: string, substances: AdvSubstance[] = []) {
  const n = norm(name);
  return substances.find((s: any) => norm(s.name) === n || norm(s.generic_name) === n || (s.brand_names ?? s.brands ?? []).some((b: string) => norm(b) === n));
}

function newestCheckin(checkins: any[] = []) {
  return [...checkins].sort((a, b) => new Date(b.checkin_at ?? b.created_at).getTime() - new Date(a.checkin_at ?? a.created_at).getTime())[0] ?? null;
}

function medicationName(m: any) {
  return m?.substances?.name ?? m?.free_text_name ?? m?.brand_name ?? "medicação";
}

export function buildMedicationEffectForecast(input: MedicationForecastInput) {
  const now = input.now ?? new Date();
  const session = input.session ?? {};
  const sleepHours = asNumber(session.sleep_hours ?? session.sleepHours);
  const caffeineTotal = asNumber(session.caffeine_total_mg ?? session.caffeineTotalMg ?? session.caffeine);
  const latest = newestCheckin(input.checkins);
  const warnings: ForecastItem[] = [];
  const learning: ForecastItem[] = [];
  const missingData: string[] = [];
  const axisMap = new Map<string, { now: number; future: number }>();

  const doseGroups = new Map<string, AdvDoseLog[]>();
  for (const dose of input.doses ?? []) {
    const key = norm(dose.substance_name);
    if (!key) continue;
    if (!doseGroups.has(key)) doseGroups.set(key, []);
    doseGroups.get(key)!.push(dose);
  }

  for (const doses of doseGroups.values()) {
    const sub = findSubstance(doses[0].substance_name, input.substances ?? []);
    const curve = buildSubstanceCurve(doses, sub, {
      sleepHours,
      sleepDeprivation0_10: asNumber(session.sleep_deprivation_level_0_10),
      caffeineMg: caffeineTotal,
      alcoholToday: !!session.alcohol_use_today,
    }, { windowHours: 24, now });
    const intensity = curve.now.value / 100;
    const benefit = (sub as any)?.clinical_effect_profile ?? {};
    const adverse = (sub as any)?.adverse_effect_profile ?? {};
    for (const [axis, raw] of Object.entries(benefit)) {
      const score = Number(raw) * intensity;
      const prev = axisMap.get(axis) ?? { now: 0, future: 0 };
      axisMap.set(axis, { now: Math.min(100, prev.now + score), future: Math.min(100, prev.future + score * 0.72) });
    }
    for (const [axis, raw] of Object.entries(adverse)) {
      const score = Number(raw) * intensity;
      const prev = axisMap.get(axis) ?? { now: 0, future: 0 };
      axisMap.set(axis, { now: Math.min(100, prev.now + score), future: Math.min(100, prev.future + score * 0.8) });
    }

    const name = doses[0].substance_name;
    const lname = norm(name);
    if ((lname.includes("lisdex") || lname.includes("venvanse") || lname.includes("lyberdia") || lname.includes("anfet")) && sleepHours != null && sleepHours < 5) {
      warnings.push({
        title: "Estimulante + sono curto",
        severity: "high",
        message: `${name} ativo com sono <5h eleva risco de irritabilidade, redose, hiperfoco disfuncional e sintomas psicotomiméticos em vulneráveis.`,
        action: "Priorizar check-in de paranoia/irritabilidade e registrar cafeína/redose.",
      });
    }
    const caffeineNear = Math.max(...doses.map((d: any) => Number(d.caffeine_near_dose_mg ?? d.caffeine_amount ?? 0)), 0);
    if ((lname.includes("lisdex") || lname.includes("atomox") || lname.includes("metilfen")) && caffeineNear >= 150) {
      warnings.push({
        title: "Carga catecolaminérgica + cafeína",
        severity: "warn",
        message: `${name} com cafeína próxima (${caffeineNear} mg) aumenta ruído autonômico: PA/FC, tremor, ansiedade, insônia e falsa leitura de eficácia.`,
      });
    }
    if (curve.overlapDetected) {
      warnings.push({
        title: "Sobreposição/redose durante fase ativa",
        severity: "high",
        message: `${name}: doses sobrepostas prolongam área funcional e risco; não interpretar como ganho linear de eficácia.`,
        action: "Registrar motivo da redose e check-in 1–3h depois.",
      });
    }
  }

  if (input.medications?.length && !input.doses?.length) missingData.push("nenhuma dose registrada nas últimas 24h");
  if (sleepHours == null) missingData.push("sono da sessão");
  if (caffeineTotal == null) missingData.push("cafeína total do dia");
  if (!latest) missingData.push("check-in clínico pós-dose");

  for (const profile of input.responseProfiles ?? []) {
    const name = profile.substance_name ?? "substância";
    if (Number(profile.average_sedation_0_100 ?? 0) >= 65) {
      learning.push({ title: `${name}: sedação individual elevada`, severity: "warn", message: "Histórico sugere sedação acima do esperado. Diferenciar sedação terapêutica de ressaca cognitiva." });
    }
    if (Number(profile.sleep_deprivation_sensitivity_0_100 ?? 0) >= 70) {
      learning.push({ title: `${name}: sensibilidade a sono ruim`, severity: "high", message: "Sono curto já apareceu associado a pior resposta/risco. Subir peso do sono na previsão." });
    }
    if (Number(profile.caffeine_sensitivity_0_100 ?? 0) >= 60) {
      learning.push({ title: `${name}: sensibilidade à cafeína`, severity: "warn", message: "Histórico sugere piora autonômica/ansiosa quando há cafeína próxima." });
    }
  }

  const stockAlerts = buildStockAlerts(input.inventory ?? [], input.medications ?? []);
  const axes: AxisForecastPoint[] = [...axisMap.entries()]
    .map(([axis, v]) => ({ axis, now: Math.round(v.now), next6h: Math.round(v.future), direction: v.future > v.now + 10 ? "subindo" as const : v.future < v.now - 10 ? "caindo" as const : "estável" as const }))
    .sort((a, b) => b.now - a.now)
    .slice(0, 8);

  const confidence = missingData.length >= 3 ? "baixa" : missingData.length >= 1 ? "moderada" : "alta";

  return { warnings, learning, missingData, stockAlerts, axes, latestCheckin: latest, confidence };
}

export function buildStockAlerts(inventory: any[], medications: any[]): StockAlert[] {
  const alerts: StockAlert[] = [];
  for (const inv of inventory) {
    const remaining = asNumber(inv.current_quantity);
    const unit = inv.unit ?? "un";
    const linkedMed = medications.find((m) => m.id === inv.patient_medication_id);
    const daily = estimateDailyUse(linkedMed, inv);
    const daysRemaining = remaining != null && daily > 0 ? Math.floor(remaining / daily) : null;
    const threshold = asNumber(inv.low_stock_threshold) ?? 7;
    const name = inv.medication_name ?? medicationName(linkedMed);
    if (remaining == null) continue;
    if (daysRemaining != null && daysRemaining <= threshold) {
      alerts.push({ medicationName: name, remaining, unit, daysRemaining, severity: daysRemaining <= 3 ? "high" : "warn", message: `${name}: estoque estimado para ${daysRemaining} dia(s).` });
    } else if (remaining <= threshold) {
      alerts.push({ medicationName: name, remaining, unit, daysRemaining, severity: "warn", message: `${name}: estoque baixo (${remaining} ${unit}).` });
    }
  }
  return alerts.sort((a, b) => (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999));
}

export function estimateDailyUse(med: any, inv?: any): number {
  const explicit = asNumber(inv?.daily_consumption_estimate);
  if (explicit && explicit > 0) return explicit;
  const dose = asNumber(med?.current_dose) ?? 1;
  const freq = norm(med?.frequency);
  if (freq.includes("2x") || freq.includes("2 x")) return dose * 2;
  if (freq.includes("3x") || freq.includes("3 x")) return dose * 3;
  if (freq.includes("4x") || freq.includes("4 x")) return dose * 4;
  if (freq.includes("noite") || freq.includes("manha") || freq.includes("1x") || freq.includes("diario") || freq.includes("dia")) return dose;
  return dose;
}
