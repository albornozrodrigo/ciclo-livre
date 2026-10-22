import { useCallback, useEffect, useRef } from 'react';

/** Tempo sem digitar antes de salvar; curto o bastante para não perder nada ao sair. */
export const AUTOSAVE_DELAY_MS = 600;

/**
 * Agenda um salvamento e o adia enquanto a pessoa digita. `flush` salva já; ao desmontar a tela,
 * o que estiver pendente é salvo (no Android, fechar o teclado não tira o foco do campo).
 */
export function useDebouncedSave<T>(save: (value: T) => void, delay = AUTOSAVE_DELAY_MS) {
  const saveRef = useRef(save);
  const pending = useRef<{ value: T } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const next = pending.current;
    pending.current = null;
    if (next) saveRef.current(next.value);
  }, []);

  const schedule = useCallback(
    (value: T) => {
      pending.current = { value };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [delay, flush],
  );

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pending.current = null;
  }, []);

  useEffect(() => flush, [flush]);

  return { schedule, flush, cancel };
}
