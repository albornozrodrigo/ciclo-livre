import { DateField } from '@/components/ui/date-field';
import { addDays, type IsoDate, todayIso } from '@/domain/dates';
import { LIMITS } from '@/domain/profile';
import { ptBR } from '@/i18n/pt-BR';

/** Data do parto (pós-parto): de hoje até um ano atrás. */
export function BabyBirthField({ value, onChange }: { value: IsoDate | null; onChange: (value: IsoDate) => void }) {
  const today = todayIso();
  return (
    <DateField
      label={ptBR.onboarding.babyBirth.label}
      value={value}
      placeholder={ptBR.onboarding.babyBirth.pick}
      min={addDays(today, -LIMITS.babyBirthMaxDaysAgo)}
      max={today}
      initial={today}
      onChange={onChange}
    />
  );
}
