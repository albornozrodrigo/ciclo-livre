import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { useAnalysis } from '@/analysis/use-analysis';
import { CycleBars, CycleHistory, CycleNumbers, Measures, SectionTitle, Symptoms, Temperature } from '@/components/analysis/sections';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { ptBR } from '@/i18n/pt-BR';
import { useProfile } from '@/profile/profile-context';

const a = ptBR.analysis;

export default function AnaliseScreen() {
  const { state } = useProfile();
  const view = useAnalysis(state.status === 'ready' ? state.profile : null);

  return (
    <Screen screen="analise" territory="lilac" shape={2}>
      {view ? (
        <View className="gap-8">
          {/* Perguntar sobre os dados: linha discreta no topo; o envio só acontece depois do consentimento. */}
          <ListRow label={ptBR.chat.entry} detail={ptBR.chat.entryDetail} onPress={() => router.push('/chat')} />
          {view.cycles ? (
            <>
              <View className="gap-4">
                <SectionTitle>{a.cycles.title}</SectionTitle>
                {view.cycles.summary ? (
                  <>
                    <CycleNumbers summary={view.cycles.summary} />
                    <CycleBars history={view.cycles.history} summary={view.cycles.summary} />
                    <CycleHistory history={view.cycles.history} />
                  </>
                ) : (
                  <Text className="text-base leading-6 text-ink dark:text-ink-night">{a.emptyCycles}</Text>
                )}
              </View>
              <View className="gap-4">
                <SectionTitle>{a.symptoms.title}</SectionTitle>
                <Symptoms rows={view.cycles.symptoms} completeCycles={view.cycles.summary?.count ?? 0} />
              </View>
              <View className="gap-4">
                <SectionTitle>{a.bbt.title}</SectionTitle>
                <Temperature chart={view.cycles.bbt} />
              </View>
            </>
          ) : (
            <Text className="text-base leading-6 text-ink-muted dark:text-ink-muted-night">{a.noCycleMode}</Text>
          )}
          <View className="gap-4">
            <SectionTitle>{a.measures.title}</SectionTitle>
            <Measures measures={view.measures} />
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
