import { buildPatientAdministrativeContext } from "./preCadastro";

/**
 * Mapeia paciente para payload MedX administrativo mínimo.
 * Não inclui dados clínicos sensíveis (diagnóstico, TUS, medicações,
 * sessões, notas, risco suicida, formulação, substâncias).
 */
export function mapPatientToMedxAdministrative(patient: any) {
  return buildPatientAdministrativeContext(patient);
}