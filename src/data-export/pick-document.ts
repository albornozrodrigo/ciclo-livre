import { getDocumentAsync } from 'expo-document-picker';
import { File } from 'expo-file-system';

export type Picked<T> = { status: 'cancelled' } | { status: 'too_large' } | { status: 'ok'; name: string; content: T };

/**
 * Seletor de documentos do Android com leitura única. O seletor copia o arquivo para o cache do app;
 * essa cópia pode ter dado de saúde e é apagada em qualquer caminho (lida, grande demais ou com erro).
 */
export async function pickDocument<T>(maxBytes: number, read: (file: File) => Promise<T>): Promise<Picked<T>> {
  const result = await getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
  if (result.canceled) return { status: 'cancelled' };
  const asset = result.assets[0];
  const copy = new File(asset.uri);
  try {
    if (asset.size !== undefined && asset.size > maxBytes) return { status: 'too_large' };
    return { status: 'ok', name: asset.name, content: await read(copy) };
  } finally {
    if (copy.exists) copy.delete();
  }
}
