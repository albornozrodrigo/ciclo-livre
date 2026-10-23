import { requireOptionalNativeModule } from 'expo';

type AppIconNative = { getIcon(): string | null; getActiveIcon(): string | null; setIcon(name: string): void };

// Opcional: fora do Android (e nos testes) o módulo não existe.
const native = requireOptionalNativeModule<AppIconNative>('AppIcon');

export const appIconSupported = () => native !== null;

/** Ícone escolhido (pode ainda não ter entrado no launcher). */
export function getAppIcon(): string | null {
  return native?.getIcon() ?? null;
}

/** Ícone que o launcher mostra agora. */
export function getActiveAppIcon(): string | null {
  return native?.getActiveIcon() ?? null;
}

/** Agenda a troca; ela acontece quando a pessoa sai do app (Home ou Recentes). */
export function setAppIcon(name: string): void {
  native?.setIcon(name);
}
