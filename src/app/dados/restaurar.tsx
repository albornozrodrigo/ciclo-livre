import { router } from 'expo-router';

import { RestoreForm } from '@/components/data/restore-form';

/** Restaurar a partir de Mais → Seus dados. */
export default function RestaurarScreen() {
  return <RestoreForm onDone={() => router.canGoBack() && router.back()} />;
}
