import * as SecureStore from 'expo-secure-store';

import { validApiKeyFormat } from '@/domain/ai/prompt';

/** A chave da pessoa fica só no armazenamento seguro do Android: nunca no banco, em log ou em exportação. */
const KEY_NAME = 'anthropic_api_key';

export const getApiKey = () => SecureStore.getItemAsync(KEY_NAME);

export async function saveApiKey(raw: string): Promise<void> {
  const key = raw.trim();
  if (!validApiKeyFormat(key)) throw new Error('Chave inválida.');
  await SecureStore.setItemAsync(KEY_NAME, key);
}

export const deleteApiKey = () => SecureStore.deleteItemAsync(KEY_NAME);

/** Para mostrar sem expor: só os 4 últimos caracteres. */
export const maskKey = (key: string) => `sk-ant-…${key.slice(-4)}`;
