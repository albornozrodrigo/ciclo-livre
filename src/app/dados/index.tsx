import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { ListRow } from '@/components/ui/list-row';
import type { ExportKind } from '@/data-export/export-actions';
import { ptBR } from '@/i18n/pt-BR';

const d = ptBR.data;
const KINDS: ExportKind[] = ['relatorio', 'planilha', 'completo', 'backup'];

/** Seus dados: cada ação gera o arquivo no aparelho e só sai por escolha explícita. */
export default function DadosScreen() {
  return (
    <FormScreen title={d.title} hint={d.hint}>
      <View>
        {KINDS.map((kind) => (
          <ListRow
            key={kind}
            label={d.kinds[kind].title}
            detail={d.kinds[kind].detail}
            onPress={() => router.push({ pathname: '/dados/exportar', params: { tipo: kind } })}
          />
        ))}
        <ListRow label={d.restore.title} detail={d.restore.detail} onPress={() => router.push('/dados/restaurar')} />
      </View>
      <Text className="text-sm leading-5 text-ink-muted dark:text-ink-muted-night">{d.notEncrypted}</Text>
    </FormScreen>
  );
}
