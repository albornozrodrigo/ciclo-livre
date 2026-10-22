import { RestoreForm } from '@/components/data/restore-form';

/** Restaurar na primeira abertura (app reinstalado ou dados apagados): com perfil restaurado, o app vai para as abas. */
export default function OnboardingRestaurarScreen() {
  return <RestoreForm onDone={() => undefined} />;
}
