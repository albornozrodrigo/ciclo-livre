import { router } from 'expo-router';

import { ClueImportForm } from '@/components/data/clue-import-form';
import { STEP_ROUTES } from '@/onboarding/routes';

/** Primeira abertura vindo do Clue: importa o histórico e segue para o perfil (o arquivo não traz um perfil do app). */
export default function OnboardingClueScreen() {
  return <ClueImportForm onDone={() => router.replace(STEP_ROUTES.birth_year)} />;
}
