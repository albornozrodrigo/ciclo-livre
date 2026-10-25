import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { DeniedNotice } from '@/components/reminders/denied-notice';
import { SwitchRow } from '@/components/reminders/switch-row';
import { useSnackbar } from '@/components/ui/snackbar';
import { todayIso } from '@/domain/dates';
import { availableKinds, needsAnchor, type Reminder, type ReminderKind } from '@/domain/reminders/catalog';
import { ptBR } from '@/i18n/pt-BR';
import { REMINDER_NAMES } from '@/i18n/pt-BR-reminders';
import { log } from '@/lib/logger';
import { useReminders } from '@/reminders/use-reminders';

const r = ptBR.reminders;

const GROUPS: { key: keyof typeof r.groups; kinds: ReminderKind[] }[] = [
  {
    key: 'cycle',
    kinds: ['period_soon', 'period_due', 'period_late', 'fertile_soon', 'phase_change', 'pregnancy_test'],
  },
  { key: 'contraception', kinds: ['birth_control'] },
  { key: 'log', kinds: ['daily_log'] },
];

export default function LembretesScreen() {
  const { profile, data, denied, save, saveDiscreet } = useReminders();
  const { show } = useSnackbar();
  if (!profile || !data) return null;

  const available = new Set(availableKinds(profile));
  const byKind = new Map(data.reminders.map((rem) => [rem.kind, rem]));

  async function toggle(rem: Reminder, enabled: boolean) {
    // Precisa de data de referência: abre o detalhe já ligado, onde a data é pedida.
    if (enabled && profile && needsAnchor(rem, profile)) {
      router.push({ pathname: '/lembretes/[tipo]', params: { tipo: rem.kind, ligar: '1' } });
      return;
    }
    // Registro: a frequência conta a partir do dia em que foi ligado.
    const anchor = rem.kind === 'daily_log' && enabled && !rem.options.anchor ? todayIso() : rem.options.anchor;
    try {
      // Negada: o aviso aparece no topo da lista, que pode estar fora da tela.
      if (!(await save({ ...rem, enabled, options: { ...rem.options, anchor } }))) show(r.deniedShort);
    } catch (error) {
      log.error('reminder_save_failed', error);
      show(r.saveFailed);
    }
  }

  return (
    <FormScreen title={r.title} hint={r.hint}>
      {denied ? <DeniedNotice /> : null}

      {GROUPS.map(({ key, kinds }) => {
        const shown = kinds.filter((k) => available.has(k));
        if (shown.length === 0) return null;
        return (
          <View key={key}>
            <Text accessibilityRole="header" className="mb-1 text-sm font-bold tracking-[0.28px] text-ink-muted dark:text-ink-muted-night">
              {r.groups[key]}
            </Text>
            {shown.map((kind) => {
              const rem = byKind.get(kind);
              if (!rem) return null;
              return (
                <SwitchRow
                  key={kind}
                  label={REMINDER_NAMES[kind]}
                  detail={r.rowDetail(rem.enabled, rem.time)}
                  value={rem.enabled}
                  onValueChange={(on) => toggle(rem, on)}
                  onPress={() =>
                    router.push({
                      pathname: '/lembretes/[tipo]',
                      params: { tipo: kind },
                    })
                  }
                />
              );
            })}
          </View>
        );
      })}

      <View className="gap-2">
        <SwitchRow
          label={r.discreet}
          detail={r.discreetHint}
          value={data.discreet}
          onValueChange={(on) =>
            saveDiscreet(on).catch((error: unknown) => {
              log.error('reminder_discreet_failed', error);
              show(r.saveFailed);
            })
          }
        />
        <Text className="text-sm leading-5 text-ink-muted dark:text-ink-muted-night">{r.timing}</Text>
      </View>
    </FormScreen>
  );
}
