import { type EventSubscription, requireOptionalNativeModule } from 'expo';

type LaunchIntentNative = {
  consumeLaunchAction(): string | null;
  addListener(event: 'onIntent', listener: (e: { action: string | null }) => void): EventSubscription;
};

// Opcional: fora do Android (e nos testes) o módulo não existe.
const native = requireOptionalNativeModule<LaunchIntentNative>('LaunchIntent');

/** Ação do intent que abriu o app, lida uma vez só (null sem módulo ou sem ação). */
export function consumeLaunchAction(): string | null {
  return native?.consumeLaunchAction() ?? null;
}

/** Avisa quando o app já aberto recebe um intent novo. */
export function addIntentListener(listener: (action: string | null) => void): { remove: () => void } {
  const sub = native?.addListener('onIntent', (e) => listener(e.action));
  return { remove: () => sub?.remove() };
}
