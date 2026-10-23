import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { Linking, Text, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { SwitchRow } from '@/components/reminders/switch-row';
import { AttentionNotice } from '@/components/ui/attention-notice';
import { Bullets } from '@/components/ui/bullets';
import { CapsuleButton } from '@/components/ui/capsule-button';
import { ListRow } from '@/components/ui/list-row';
import { useSnackbar } from '@/components/ui/snackbar';
import type { HealthImportResult } from '@/db/health-import-repo';
import {
  getHealthSettings,
  HEALTH_TYPES,
  type HealthSettings,
  type HealthType,
  setHealthConnected,
  setHealthTypes,
} from '@/db/health-settings-repo';
import { connectHealth, type HealthStatus, healthStatus, openHealthSettings } from '@/health/health-connect';
import { importFromHealthConnect } from '@/health/import-health';
import { ptBR } from '@/i18n/pt-BR';
import { log } from '@/lib/logger';

const h = ptBR.health;
const STORE_URL = 'market://details?id=com.google.android.apps.healthdata';

const when = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Resultado em frases curtas: o que entrou por tipo, o que ficou de fora e o que foi descartado. */
function resultLines(r: HealthImportResult): string[] {
  const parts = HEALTH_TYPES.filter((t) => r.added[t]).map((t) => h.addedPart(h.types[t], r.added[t]));
  const lines = [parts.length ? h.added(parts.join(', ')) : h.nothingNew];
  if (r.kept) lines.push(h.kept(r.kept));
  if (r.dropped) lines.push(h.dropped(r.dropped));
  return lines;
}

/** Mais → Health Connect: escolher o que ler, conectar (só leitura), importar e desconectar. */
export default function HealthScreen() {
  const db = useSQLiteContext();
  const { show } = useSnackbar();
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [settings, setSettings] = useState<HealthSettings | null>(null);
  const [chosen, setChosen] = useState<HealthType[]>([...HEALTH_TYPES]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // Trava síncrona: dois toques seguidos não abrem dois pedidos de permissão nem dois imports.
  const working = useRef(false);

  const load = useCallback(() => {
    let active = true;
    Promise.all([healthStatus(), getHealthSettings(db)])
      .then(([s, current]) => {
        if (!active) return;
        setStatus(s);
        setSettings(current);
        setChosen(current.types);
      })
      .catch((e: unknown) => {
        log.error('health_load_failed', e);
        if (active) setStatus('unavailable');
      });
    return () => {
      active = false;
    };
  }, [db]);
  useFocusEffect(load);

  async function run(task: () => Promise<void>) {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setFailed(false);
    setNotice(null);
    try {
      await task();
    } catch (e) {
      log.error('health_import_failed', e);
      setFailed(true);
    } finally {
      working.current = false;
      setBusy(false);
    }
  }

  const importNow = () =>
    run(async () => {
      const r = await importFromHealthConnect(db);
      setSettings(await getHealthSettings(db));
      setResult(r ? resultLines(r) : null);
    });

  const connect = () =>
    run(async () => {
      const granted = (await connectHealth(chosen)).filter((t) => chosen.includes(t));
      if (granted.length === 0) {
        setNotice(h.noneGranted);
        return;
      }
      await setHealthTypes(db, granted);
      await setHealthConnected(db, true);
      const r = await importFromHealthConnect(db);
      setSettings(await getHealthSettings(db));
      setResult(r ? resultLines(r) : null);
    });

  async function disconnect() {
    try {
      await setHealthConnected(db, false);
      setSettings(await getHealthSettings(db));
      setResult(null);
      show(h.disconnected);
    } catch (e) {
      log.error('health_disconnect_failed', e);
      show(ptBR.ai.saveFailed);
    }
  }

  if (!status || !settings) return null;

  if (status !== 'available') {
    return (
      <FormScreen title={h.title} hint={h.hint}>
        <View className="gap-4">
          <Text className="text-base font-bold leading-6 text-ink dark:text-ink-night">
            {status === 'needs_update' ? h.needsUpdate : h.unavailable}
          </Text>
          <CapsuleButton label={h.store} variant="outline" onPress={() => Linking.openURL(STORE_URL).catch(() => undefined)} />
        </View>
      </FormScreen>
    );
  }

  const feedback = (
    <>
      {busy ? (
        <Text accessibilityLiveRegion="polite" className="text-base text-ink-muted dark:text-ink-muted-night">
          {h.importing}
        </Text>
      ) : null}
      {result ? (
        <View accessibilityLiveRegion="polite" className="gap-1">
          {result.map((line) => (
            <Text key={line} className="text-base leading-6 text-ink dark:text-ink-night">
              {line}
            </Text>
          ))}
        </View>
      ) : null}
      {notice ? (
        <Text accessibilityLiveRegion="polite" className="text-base font-bold leading-6 text-ink dark:text-ink-night">
          {notice}
        </Text>
      ) : null}
      {failed ? <AttentionNotice text={h.failed} actionLabel={h.retry} onAction={settings.connected ? importNow : connect} /> : null}
    </>
  );

  if (!settings.connected) {
    const toggle = (t: HealthType, on: boolean) => setChosen((prev) => HEALTH_TYPES.filter((x) => (x === t ? on : prev.includes(x))));
    return (
      <FormScreen title={h.title} hint={h.hint} actionLabel={h.connect} onAction={connect} actionDisabled={busy || chosen.length === 0}>
        <View className="gap-3">
          <Text accessibilityRole="header" className="text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
            {h.rulesTitle}
          </Text>
          <Bullets items={h.rules} />
        </View>
        <View>
          <Text accessibilityRole="header" className="mb-2 text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
            {h.typesTitle}
          </Text>
          {HEALTH_TYPES.map((t) => (
            <SwitchRow key={t} label={h.types[t]} value={chosen.includes(t)} onValueChange={(on) => toggle(t, on)} />
          ))}
        </View>
        {feedback}
      </FormScreen>
    );
  }

  return (
    <FormScreen title={h.title} hint={h.hint} actionLabel={h.importNow} onAction={importNow} actionDisabled={busy}>
      <View className="gap-3">
        <Text className="text-base font-bold text-ink dark:text-ink-night">
          {settings.lastImport ? h.lastImport(when(settings.lastImport)) : h.neverImported}
        </Text>
        <Text className="text-sm leading-5 text-ink-muted dark:text-ink-muted-night">
          {settings.types.map((t) => h.types[t]).join(' · ')}
        </Text>
        {feedback}
      </View>
      <View className="gap-3">
        <ListRow label={h.openSettings} onPress={openHealthSettings} />
        <CapsuleButton label={h.disconnect} variant="outline" onPress={disconnect} disabled={busy} />
      </View>
    </FormScreen>
  );
}
