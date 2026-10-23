import {
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

import { HEALTH_TYPES, type HealthType } from '@/db/health-settings-repo';
import type { HealthInput, InstantSample, SleepSample } from '@/domain/health/health-import';

/** Tipo do app → tipo de registro do Health Connect (só leitura). */
const RECORD = {
  sleep: 'SleepSession',
  temperature: 'BasalBodyTemperature',
  resting_heart_rate: 'RestingHeartRate',
  hrv: 'HeartRateVariabilityRmssd',
  weight: 'Weight',
} as const satisfies Record<HealthType, string>;

/** Teto de páginas por tipo: 30 dias cabem com folga; impede laço infinito se o provedor repetir o token. */
const MAX_PAGES = 50;

export type HealthStatus = 'available' | 'needs_update' | 'unavailable';

export async function healthStatus(): Promise<HealthStatus> {
  const status = await getSdkStatus();
  if (status === SdkAvailabilityStatus.SDK_AVAILABLE) return 'available';
  if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'needs_update';
  return 'unavailable';
}

const toType = (recordType: string): HealthType | undefined => HEALTH_TYPES.find((t) => RECORD[t] === recordType);

function readTypes(permissions: readonly { accessType?: string; recordType?: string }[]): HealthType[] {
  const types = new Set<HealthType>();
  for (const p of permissions) {
    const t = p.accessType === 'read' && p.recordType ? toType(p.recordType) : undefined;
    if (t) types.add(t);
  }
  return HEALTH_TYPES.filter((t) => types.has(t));
}

/** Pede só leitura dos tipos escolhidos; devolve os que a pessoa concedeu. */
export async function connectHealth(types: readonly HealthType[]): Promise<HealthType[]> {
  await initialize();
  const wanted = HEALTH_TYPES.filter((t) => types.includes(t));
  const granted = await requestPermission(wanted.map((t) => ({ accessType: 'read' as const, recordType: RECORD[t] })));
  return readTypes(granted as { accessType?: string; recordType?: string }[]);
}

export async function grantedHealthTypes(): Promise<HealthType[]> {
  await initialize();
  return readTypes((await getGrantedPermissions()) as { accessType?: string; recordType?: string }[]);
}

export function openHealthSettings(): void {
  openHealthConnectSettings();
}

type AnyRecord = Record<string, unknown>;
const offsetOf = (z: unknown) =>
  z && typeof z === 'object' && typeof (z as { totalSeconds?: unknown }).totalSeconds === 'number'
    ? (z as { totalSeconds: number }).totalSeconds
    : undefined;
const num = (v: unknown) => (typeof v === 'number' ? v : Number.NaN);

async function readAll(type: HealthType, from: Date, to: Date): Promise<AnyRecord[]> {
  const out: AnyRecord[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await readRecords(RECORD[type], {
      timeRangeFilter: { operator: 'between', startTime: from.toISOString(), endTime: to.toISOString() },
      ...(pageToken ? { pageToken } : {}),
    });
    out.push(...(result.records as unknown as AnyRecord[]));
    pageToken = result.pageToken || undefined;
    if (!pageToken) break;
  }
  return out;
}

const instant = (r: AnyRecord, value: number): InstantSample => ({ time: String(r.time), offsetSeconds: offsetOf(r.zoneOffset), value });

/** Lê os tipos pedidos no intervalo e converte para a entrada do domínio. Nunca registra valores em log. */
export async function readHealth(types: readonly HealthType[], from: Date, to: Date): Promise<HealthInput> {
  await initialize();
  const input: HealthInput = {};
  for (const type of types) {
    const records = await readAll(type, from, to);
    if (type === 'weight') input.weight = records.map((r) => instant(r, num((r.weight as AnyRecord | undefined)?.inKilograms)));
    if (type === 'temperature')
      input.basalTemperature = records.map((r) => instant(r, num((r.temperature as AnyRecord | undefined)?.inCelsius)));
    if (type === 'resting_heart_rate') input.restingHeartRate = records.map((r) => instant(r, num(r.beatsPerMinute)));
    if (type === 'hrv') input.hrv = records.map((r) => instant(r, num(r.heartRateVariabilityMillis)));
    if (type === 'sleep')
      input.sleep = records.map((r): SleepSample => ({
        startTime: String(r.startTime),
        endTime: String(r.endTime),
        endOffsetSeconds: offsetOf(r.endZoneOffset),
      }));
  }
  return input;
}
