import { NativeTabs } from 'expo-router/native-tabs';
import { useColorScheme } from 'react-native';

import { Palette } from '@/constants/theme';
import { ptBR } from '@/i18n/pt-BR';

export default function AppTabs() {
  const colors = Palette[useColorScheme() === 'dark' ? 'dark' : 'light'];

  return (
    <NativeTabs
      backgroundColor={colors.water}
      indicatorColor={colors.land}
      labelVisibilityMode="labeled"
      labelStyle={{ default: { color: colors.inkMuted }, selected: { color: colors.ink } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{ptBR.tabs.hoje}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="water_drop" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="calendario">
        <NativeTabs.Trigger.Label>{ptBR.tabs.calendario}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="calendar_month" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="analise">
        <NativeTabs.Trigger.Label>{ptBR.tabs.analise}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="insights" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explorar">
        <NativeTabs.Trigger.Label>{ptBR.tabs.explorar}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="explore" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="mais">
        <NativeTabs.Trigger.Label>{ptBR.tabs.mais}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="more_horiz" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
