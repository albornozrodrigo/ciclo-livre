import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { ListRow } from '@/components/ui/list-row';
import { ptBR } from '@/i18n/pt-BR';
import { useProfile } from '@/profile/profile-context';

const copy = ptBR.profile;

/** Atalhos para trocar de modo e corrigir os dados do onboarding. */
export function ProfileSection() {
  const { state } = useProfile();
  const mode = state.status === 'ready' ? state.profile?.mode : undefined;

  return (
    <View className="gap-1">
      <Text accessibilityRole="header" className="mb-2 text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
        {copy.title}
      </Text>
      <ListRow
        label={copy.changeMode}
        detail={mode ? `${copy.currentMode}: ${ptBR.onboarding.mode.options[mode].label}` : undefined}
        onPress={() => router.push('/perfil/modo')}
      />
      <ListRow label={copy.cycleData} detail={copy.cycleDataHint} onPress={() => router.push('/perfil/ciclo')} />
    </View>
  );
}
