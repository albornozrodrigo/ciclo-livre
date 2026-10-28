import { router } from 'expo-router';
import { useState } from 'react';

import { useSnackbar } from '@/components/ui/snackbar';
import { todayIso } from '@/domain/dates';
import { type Profile, validateProfileEdit } from '@/domain/profile';
import { ptBR } from '@/i18n/pt-BR';
import { log } from '@/lib/logger';

import { useProfile } from './profile-context';

/** Rascunho local do perfil + salvar validado, com confirmação e volta para a tela anterior. */
export function useProfileEditor() {
  const { state, saveProfile } = useProfile();
  const { show } = useSnackbar();
  const initial = state.status === 'ready' ? state.profile : null;
  const [draft, setDraft] = useState<Profile | null>(initial);
  const [saving, setSaving] = useState(false);

  /** Aceita um patch ou uma função do rascunho atual (para respostas que chegam depois, sem pisar no que a pessoa mudou). */
  const update = (patch: Partial<Profile> | ((current: Profile) => Partial<Profile>)) =>
    setDraft((current) => (current ? { ...current, ...(typeof patch === 'function' ? patch(current) : patch) } : current));

  // Datas guardadas que envelheceram sozinhas não travam a edição de outros campos.
  const validation = draft && initial ? validateProfileEdit(draft, initial, todayIso()) : null;

  async function save() {
    if (!validation?.ok) return;
    const result = validation;
    setSaving(true);
    try {
      await saveProfile(result.profile);
      show(ptBR.profile.saved);
      // Aberto por link, pode não haver tela anterior.
      if (router.canGoBack()) router.back();
      else router.replace('/mais');
    } catch (error) {
      log.error('profile_save_failed', error);
      show(ptBR.profile.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  return { draft, update, save, canSave: Boolean(validation?.ok) && !saving };
}
