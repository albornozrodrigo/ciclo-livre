import { router } from 'expo-router';

import { ClueImportForm } from '@/components/data/clue-import-form';

/** Importar do Clue a partir de Mais → Seus dados. */
export default function ClueScreen() {
  return <ClueImportForm onDone={() => router.canGoBack() && router.back()} />;
}
