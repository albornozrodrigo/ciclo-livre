import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { BabyBirthField } from '@/components/fields/baby-birth-field';
import { FormScreen } from '@/components/form-screen';
import { ChoiceList } from '@/components/ui/choice-list';
import { useSnackbar } from '@/components/ui/snackbar';
import { type IsoDate, todayIso } from '@/domain/dates';
import { endPregnancy } from '@/domain/pregnancy-end';
import { validateProfileEdit } from '@/domain/profile';
import { ptBR } from '@/i18n/pt-BR';
import { log } from '@/lib/logger';
import { useProfile } from '@/profile/profile-context';

const copy = ptBR.profile.endPregnancy;
const options = (['birth', 'other'] as const).map((value) => ({ value, label: copy.options[value] }));

/** Encerrar a gravidez: nascimento leva ao pós-parto; outra forma volta ao ciclo, sem pedir detalhe. */
export default function EndPregnancyScreen() {
  const { state, saveProfile } = useProfile();
  const { show } = useSnackbar();
  const [choice, setChoice] = useState<'birth' | 'other' | null>(null);
  const [birth, setBirth] = useState<IsoDate | null>(null);
  const [saving, setSaving] = useState(false);
  const profile = state.status === 'ready' ? state.profile : null;
  if (!profile) return null;

  const next =
    choice === 'birth' && birth
      ? endPregnancy(profile, { kind: 'birth', date: birth })
      : choice === 'other'
        ? endPregnancy(profile, { kind: 'other' })
        : null;
  // Mesma validação das outras edições de perfil (datas que só envelheceram não travam).
  const valid = next !== null && validateProfileEdit(next, profile, todayIso()).ok;

  async function handleSave() {
    if (!next || !valid) return;
    setSaving(true);
    try {
      await saveProfile(next);
      // Volta para as abas sem empilhar outra cópia delas.
      router.dismissTo('/(tabs)');
    } catch (error) {
      log.error('end_pregnancy_failed', error);
      show(ptBR.profile.saveFailed);
      setSaving(false);
    }
  }

  return (
    <FormScreen title={copy.title} hint={copy.hint} actionLabel={copy.save} onAction={handleSave} actionDisabled={!valid || saving}>
      <ChoiceList label={copy.title} options={options} value={choice} onChange={setChoice} />
      {choice === 'birth' ? <BabyBirthField value={birth} onChange={setBirth} /> : null}
      {choice === 'other' ? (
        <View className="gap-3 rounded-[28px] border-[1.5px] border-ink p-5 dark:border-ink-night">
          <Text className="text-base leading-6 text-ink dark:text-ink-night">{copy.care}</Text>
          <Text className="text-base leading-6 text-ink dark:text-ink-night">{copy.support}</Text>
        </View>
      ) : null}
    </FormScreen>
  );
}
