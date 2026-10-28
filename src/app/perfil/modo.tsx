import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Text } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { ChoiceList } from '@/components/ui/choice-list';
import { BabyBirthField } from '@/components/fields/baby-birth-field';
import { DueDateField } from '@/components/fields/due-date-field';
import { FinalPeriodField } from '@/components/fields/final-period-field';
import { SwitchRow } from '@/components/reminders/switch-row';
import { getLastBleedDate } from '@/db/cycle-repo';
import { todayIso } from '@/domain/dates';
import { type Mode, MODES, suggestFinalPeriod, TRYING_SINCE } from '@/domain/profile';
import { ptBR } from '@/i18n/pt-BR';
import { log } from '@/lib/logger';
import { useProfileEditor } from '@/profile/use-profile-editor';

const modeCopy = ptBR.onboarding.mode;
const modeOptions = MODES.map((mode) => ({ value: mode, label: modeCopy.options[mode].label, detail: modeCopy.options[mode].detail }));
const tryingOptions = TRYING_SINCE.map((value) => ({ value, label: ptBR.onboarding.tryingSince.options[value] }));

/** Trocar de modo: todos livres, sem "tem certeza?" nem cadeado. */
export default function ChangeModeScreen() {
  const db = useSQLiteContext();
  const { draft, update, save, canSave } = useProfileEditor();
  const [suggested, setSuggested] = useState(false);
  if (!draft) return null;

  // Menopausa sem data: sugere o último sangramento registrado, sem pisar numa data que a pessoa já escolheu.
  async function chooseMode(mode: Mode) {
    update({ mode });
    if (mode !== 'menopause' || draft?.finalPeriod) return;
    try {
      const today = todayIso();
      const suggestion = suggestFinalPeriod(await getLastBleedDate(db, today), today);
      if (!suggestion) return;
      update((current) => (current.mode === 'menopause' && current.finalPeriod === null ? { finalPeriod: suggestion } : {}));
      setSuggested(true);
    } catch (error) {
      log.error('final_period_suggestion_failed', error);
    }
  }

  return (
    <FormScreen
      title={ptBR.profile.modeTitle}
      hint={ptBR.profile.modeHint}
      actionLabel={ptBR.profile.save}
      onAction={save}
      actionDisabled={!canSave}>
      <ChoiceList label={ptBR.profile.modeTitle} options={modeOptions} value={draft.mode} onChange={chooseMode} />
      {draft.mode === 'pregnancy' ? <DueDateField value={draft.dueDate} onChange={(dueDate) => update({ dueDate })} /> : null}
      {draft.mode === 'pregnancy' ? (
        <SwitchRow label={ptBR.profile.twins} value={draft.twins} onValueChange={(twins) => update({ twins })} />
      ) : null}
      {draft.mode === 'postpartum' ? <BabyBirthField value={draft.babyBirth} onChange={(babyBirth) => update({ babyBirth })} /> : null}
      {draft.mode === 'menopause' ? (
        <>
          <FinalPeriodField
            value={draft.finalPeriod}
            onChange={(finalPeriod) => {
              setSuggested(false);
              update({ finalPeriod });
            }}
          />
          {suggested && draft.finalPeriod ? (
            <Text className="text-sm leading-5 text-ink-muted dark:text-ink-muted-night">{ptBR.onboarding.finalPeriod.suggested}</Text>
          ) : null}
        </>
      ) : null}
      {draft.mode === 'conceive' ? (
        <ChoiceList
          label={ptBR.onboarding.tryingSince.title}
          options={tryingOptions}
          value={draft.tryingSince}
          onChange={(tryingSince) => update({ tryingSince })}
        />
      ) : null}
    </FormScreen>
  );
}
