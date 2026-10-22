import { DateField } from '@/components/ui/date-field';
import { addDays, type IsoDate, todayIso } from '@/domain/dates';
import { LIMITS } from '@/domain/profile';
import { ptBR } from '@/i18n/pt-BR';

/** Abre o calendário perto do meio de uma gravidez típica, para menos rolagem. */
const DUE_DATE_INITIAL_DAYS_AHEAD = 140;

export function DueDateField({ value, onChange }: { value: IsoDate | null; onChange: (value: IsoDate) => void }) {
  const today = todayIso();
  return (
    <DateField
      label={ptBR.onboarding.dueDate.label}
      value={value}
      placeholder={ptBR.onboarding.dueDate.pick}
      min={today}
      max={addDays(today, LIMITS.dueDateMaxDaysAhead)}
      initial={addDays(today, DUE_DATE_INITIAL_DAYS_AHEAD)}
      onChange={onChange}
    />
  );
}
