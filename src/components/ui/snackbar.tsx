import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const SNACKBAR_DURATION_MS = 4000;
/** Altura aproximada da barra de navegação inferior, para o snackbar ficar acima dela. */
const NAVIGATION_BAR_CLEARANCE = 88;

type Message = { id: number; text: string };
type SnackbarContextValue = { show: (text: string) => void };

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

/** Snackbar Material: feedback passageiro, anunciado ao TalkBack, some sozinho. */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<Message | null>(null);
  const nextId = useRef(0);

  const show = useCallback((text: string) => {
    nextId.current += 1;
    setMessage({ id: nextId.current, text });
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), SNACKBAR_DURATION_MS);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <SnackbarContext.Provider value={{ show }}>
      {children}
      {message ? <SnackbarView text={message.text} /> : null}
    </SnackbarContext.Provider>
  );
}

function SnackbarView({ text }: { text: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      testID="snackbar"
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      style={{ bottom: insets.bottom + NAVIGATION_BAR_CLEARANCE }}
      className="absolute left-4 right-4 min-h-12 justify-center rounded-[20px] bg-ink px-5 py-3.5 dark:bg-ink-night">
      <Text className="text-base leading-6 text-water dark:text-water-night">{text}</Text>
    </View>
  );
}

export function useSnackbar(): SnackbarContextValue {
  const value = useContext(SnackbarContext);
  if (!value) throw new Error('useSnackbar precisa estar dentro de SnackbarProvider.');
  return value;
}
