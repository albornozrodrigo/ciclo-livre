import { router } from 'expo-router';
import { useEffect } from 'react';

import { addIntentListener, consumeLaunchAction } from '../../modules/launch-intent';

/** Ações com que o Health Connect abre o app para mostrar a política de privacidade (até o Android 13 e 14+). */
const POLICY_ACTIONS = new Set(['androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE', 'android.intent.action.VIEW_PERMISSION_USAGE']);

/** Leva à política quando o sistema abre o app pelo link do Health Connect. */
export function LaunchIntentBridge() {
  useEffect(() => {
    const open = (action: string | null) => {
      if (action && POLICY_ACTIONS.has(action)) router.push('/privacidade');
    };
    open(consumeLaunchAction());
    const sub = addIntentListener(open);
    return () => sub.remove();
  }, []);
  return null;
}
