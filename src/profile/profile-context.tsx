import { useSQLiteContext } from 'expo-sqlite';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { getProfile, saveProfile as saveProfileRow } from '@/db/profile-repo';
import type { Profile } from '@/domain/profile';

type ProfileState =
  | { status: 'loading' }
  | { status: 'ready'; profile: Profile | null }
  | { status: 'failed'; error: unknown };

type ProfileContextValue = {
  state: ProfileState;
  saveProfile: (profile: Profile) => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

/** Carrega o perfil do banco (criptografado) e o mantém em memória para o app. */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [state, setState] = useState<ProfileState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getProfile(db).then(
      (profile) => active && setState({ status: 'ready', profile }),
      (error: unknown) => active && setState({ status: 'failed', error }),
    );
    return () => {
      active = false;
    };
  }, [db]);

  const saveProfile = useCallback(
    async (profile: Profile) => {
      await saveProfileRow(db, profile);
      setState({ status: 'ready', profile });
    },
    [db],
  );

  // Falha de leitura sobe para o ErrorBoundary (tela de erro com "tentar de novo").
  if (state.status === 'failed') throw state.error;

  return <ProfileContext.Provider value={{ state, saveProfile }}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('useProfile precisa estar dentro de ProfileProvider.');
  return value;
}
