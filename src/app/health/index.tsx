import { router, useFocusEffect } from 'expo-router';
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
import {
  connectHealth,
  grantedHealthTypes,
  type HealthStatus,
  healthStatus,
  openHealthSettings,
  revokeHealth,
} from '@/health/health-connect';
import { importFromHealthConnect } from '@/health/import-health';
import { ptBR } from '@/i18n/pt-BR';
import { log } from '@/lib/logger';

const h = ptBR.health;
const STORE_URL = 'market://details?id=com.google.android.apps.healthdata';

const when = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

type ResultView = { rows: { type: HealthType; count: number }[]; notes: string[] };

/** O que entrou por tipo (linhas da tabela) e, abaixo, o que ficou de fora. */
function resultView(r: HealthImportResult): ResultView {
  const rows = HEALTH_TYPES.filter((t) => r.added[t]).map((t) => ({ type: t, count: r.added[t] }));
  const notes: string[] = [];
  if (r.kept) notes.push(h.kept(r.kept));
  if (r.dropped) notes.push(h.dropped(r.dropped));
  return { rows, notes };
}

/** Tabela como a prévia de importação: linha ≥56dp, filete, quantidade 700 tabular, um foco por linha. */
function ResultTable({ view }: { view: ResultView }) {
  return (
    <View accessibilityLiveRegion="polite" className="gap-2">
      <Text accessibilityRole="header" className="text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
        {h.resultTitle}
      </Text>
      {view.rows.length === 0 ? <Text className="text-base leading-6 text-ink dark:text-ink-night">{h.nothingNew}</Text> : null}
      {view.rows.map(({ type, count }) => (
        <View
          key={type}
          accessible
          accessibilityLabel={`${h.types[type]}: ${h.days(count)}`}
          className="min-h-14 flex-row items-center justify-between gap-3 border-b border-line dark:border-line-night">
          <Text className="flex-1 text-base text-ink dark:text-ink-night">{h.types[type]}</Text>
          <Text className="text-base font-bold text-ink [font-variant:tabular-nums] dark:text-ink-night">{h.days(count)}</Text>
        </View>
      ))}
      {view.notes.map((line) => (
        <Text key={line} className="text-sm leading-5 text-ink-muted dark:text-ink-muted-night">
          {line}
        </Text>
      ))}
    </View>
  );
}

/** Mais → Health Connect: escolher o que ler, conectar (só leitura), importar e desconectar. */
export default function HealthScreen() {
  const db = useSQLiteContext();
  const { show } = useSnackbar();
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [settings, setSettings] = useState<HealthSettings | null>(null);
  // Tipos escolhidos que o Health Connect ainda libera (a pessoa pode tirar a permissão lá).
  const [granted, setGranted] = useState<HealthType[]>([]);
  const [chosen, setChosen] = useState<HealthType[]>([...HEALTH_TYPES]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ResultView | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // Trava síncrona: dois toques seguidos não abrem dois pedidos de permissão nem dois imports.
  const working = useRef(false);

  const refresh = useCallback(async () => {
    const current = await getHealthSettings(db);
    const allowed = current.connected ? await grantedHealthTypes() : [];
    setSettings(current);
    setGranted(current.types.filter((t) => allowed.includes(t)));
    return current;
  }, [db]);

  const load = useCallback(() => {
    let active = true;
    healthStatus()
      .then(async (s) => {
        if (!active) return;
        setStatus(s);
        if (s !== 'available') return;
        const current = await refresh();
        if (active) setChosen(current.types);
      })
      .catch((e: unknown) => {
        log.error('health_load_failed', e);
        if (active) setStatus('unavailable');
      });
    return () => {
      active = false;
    };
  }, [refresh]);
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
      // Conectou mas a leitura falhou: a tela acompanha o banco ("Tentar de novo" importa, não pede permissão de novo).
      await refresh().catch((err: unknown) => log.error('health_load_failed', err));
    } finally {
      working.current = false;
      setBusy(false);
    }
  }

  const importNow = () =>
    run(async () => {
      const r = await importFromHealthConnect(db);
      await refresh();
      setResult(r ? resultView(r) : null);
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
      await refresh();
      setResult(r ? resultView(r) : null);
    });

  async function disconnect() {
    try {
      await setHealthConnected(db, false);
      await refresh();
      setResult(null);
      show(h.disconnected);
      // O app já parou de ler; tirar a permissão no Health Connect vale depois que o app reinicia.
      await revokeHealth().catch((e: unknown) => log.error('health_revoke_failed', e));
    } catch (e) {
      log.error('health_disconnect_failed', e);
      show(ptBR.ai.saveFailed);
    }
  }

  if (!status || (status === 'available' && !settings)) return null;

  if (status === 'needs_update') {
    return (
      <FormScreen
        title={h.title}
        hint={h.hint}
        actionLabel={h.store}
        onAction={() => Linking.openURL(STORE_URL).catch((e: unknown) => log.error('health_store_failed', e))}>
        <Text className="text-base font-bold leading-6 text-ink dark:text-ink-night">{h.needsUpdate}</Text>
      </FormScreen>
    );
  }
  if (status === 'unavailable') {
    return (
      <FormScreen title={h.title} hint={h.hint}>
        <Text className="text-base font-bold leading-6 text-ink dark:text-ink-night">{h.unavailable}</Text>
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
      {result ? <ResultTable view={result} /> : null}
      {notice ? (
        <Text accessibilityLiveRegion="polite" className="text-base font-bold leading-6 text-ink dark:text-ink-night">
          {notice}
        </Text>
      ) : null}
      {failed ? <AttentionNotice text={h.failed} actionLabel={h.retry} onAction={settings?.connected ? importNow : connect} /> : null}
    </>
  );

  const settingsRow = (
    <View>
      <ListRow label={h.openSettings} detail={h.openSettingsHint} onPress={openHealthSettings} />
      <ListRow label={ptBR.policy.link} detail={ptBR.policy.linkHint} onPress={() => router.push('/privacidade')} />
    </View>
  );

  if (!settings?.connected) {
    const toggle = (t: HealthType, on: boolean) => setChosen((prev) => HEALTH_TYPES.filter((x) => (x === t ? on : prev.includes(x))));
    return (
      <FormScreen title={h.title} hint={h.hint} actionLabel={h.connect} onAction={connect} actionDisabled={busy || chosen.length === 0}>
        {/* No topo: depois de tocar em Conectar, o retorno aparece sem rolar. */}
        {feedback}
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
        {settingsRow}
      </FormScreen>
    );
  }

  return (
    <FormScreen title={h.title} hint={h.hint} actionLabel={h.importNow} onAction={importNow} actionDisabled={busy || granted.length === 0}>
      {feedback}
      <View className="gap-2">
        <Text className="text-base font-bold text-ink dark:text-ink-night">
          {settings.lastImport ? h.lastImport(when(settings.lastImport)) : h.neverImported}
        </Text>
        {granted.length ? (
          <Text className="text-base leading-6 text-ink dark:text-ink-night">{h.reading(granted.map((t) => h.types[t]).join(', '))}</Text>
        ) : (
          <AttentionNotice text={h.noneLeft} actionLabel={h.openSettings} onAction={openHealthSettings} />
        )}
      </View>
      <View className="gap-3">
        {settingsRow}
        <CapsuleButton label={h.disconnect} variant="outline" onPress={disconnect} disabled={busy} />
      </View>
    </FormScreen>
  );
}
