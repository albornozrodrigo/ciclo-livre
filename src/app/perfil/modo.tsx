import { FormScreen } from '@/components/form-screen';
import { ChoiceList } from '@/components/ui/choice-list';
import { BabyBirthField } from '@/components/fields/baby-birth-field';
import { DueDateField } from '@/components/fields/due-date-field';
import { MODES, TRYING_SINCE } from '@/domain/profile';
import { ptBR } from '@/i18n/pt-BR';
import { useProfileEditor } from '@/profile/use-profile-editor';

const modeCopy = ptBR.onboarding.mode;
const modeOptions = MODES.map((mode) => ({ value: mode, label: modeCopy.options[mode].label, detail: modeCopy.options[mode].detail }));
const tryingOptions = TRYING_SINCE.map((value) => ({ value, label: ptBR.onboarding.tryingSince.options[value] }));

/** Trocar de modo: todos livres, sem "tem certeza?" nem cadeado. */
export default function ChangeModeScreen() {
  const { draft, update, save, canSave } = useProfileEditor();
  if (!draft) return null;

  return (
    <FormScreen
      title={ptBR.profile.modeTitle}
      hint={ptBR.profile.modeHint}
      actionLabel={ptBR.profile.save}
      onAction={save}
      actionDisabled={!canSave}>
      <ChoiceList label={ptBR.profile.modeTitle} options={modeOptions} value={draft.mode} onChange={(mode) => update({ mode })} />
      {draft.mode === 'pregnancy' ? <DueDateField value={draft.dueDate} onChange={(dueDate) => update({ dueDate })} /> : null}
      {draft.mode === 'postpartum' ? <BabyBirthField value={draft.babyBirth} onChange={(babyBirth) => update({ babyBirth })} /> : null}
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
