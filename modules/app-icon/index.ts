import { requireOptionalNativeModule } from 'expo';

type AppIconNative = { getIcon(): string; setIcon(name: string): void };

// Opcional: fora do Android (e nos testes) o módulo não existe.
const native = requireOptionalNativeModule<AppIconNative>('AppIcon');

export const appIconSupported = () => native !== null;

/** Ícone ativo no launcher (ou o que vai entrar quando o app for para o segundo plano). */
export function getAppIcon(): string | null {
  return native?.getIcon() ?? null;
}

/** Agenda a troca; ela acontece quando o app sai da tela. */
export function setAppIcon(name: string): void {
  native?.setIcon(name);
}
