import { router, useRootNavigationState } from 'expo-router';
import { useEffect, useRef } from 'react';

import { addIntentListener, consumeLaunchAction } from '../../modules/launch-intent';

/** Ações com que o Health Connect abre o app para mostrar a política de privacidade (até o Android 13 e 14+). */
const POLICY_ACTIONS = new Set(['androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE', 'android.intent.action.VIEW_PERMISSION_USAGE']);

const isPolicy = (action: string | null) => action !== null && POLICY_ACTIONS.has(action);

/** Leva à política quando o sistema abre o app pelo link do Health Connect. */
export function LaunchIntentBridge() {
  // Navegar antes de o navegador montar lança erro: a abertura a frio espera o estado da raiz.
  const ready = useRootNavigationState()?.key !== undefined;
  const pending = useRef(false);

  useEffect(() => {
    if (isPolicy(consumeLaunchAction())) pending.current = true;
    const sub = addIntentListener((action) => {
      if (isPolicy(action)) router.push('/privacidade');
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (ready && pending.current) {
      pending.current = false;
      router.push('/privacidade');
    }
  }, [ready]);

  return null;
}
