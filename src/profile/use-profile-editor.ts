import { router } from 'expo-router';
import { useState } from 'react';

import { useSnackbar } from '@/components/ui/snackbar';
import { isoFromDate } from '@/domain/dates';
import { type Profile, validateProfile } from '@/domain/profile';
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

  const update = (patch: Partial<Profile>) => setDraft((current) => (current ? { ...current, ...patch } : current));

  async function save() {
    if (!draft) return;
    const result = validateProfile(draft, isoFromDate(new Date()));
    if (!result.ok) return;
    setSaving(true);
    try {
      await saveProfile(result.profile);
      show(ptBR.profile.saved);
      router.back();
    } catch (error) {
      log.error('profile_save_failed', error);
      show(ptBR.profile.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  const valid = draft !== null && validateProfile(draft, isoFromDate(new Date())).ok;
  return { draft, update, save, canSave: valid && !saving };
}
