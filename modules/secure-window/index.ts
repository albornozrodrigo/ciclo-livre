import { requireOptionalNativeModule } from 'expo';

type SecureWindowNative = { setSecure(on: boolean): Promise<void> };

// Opcional: fora do Android (e nos testes) o módulo não existe.
const native = requireOptionalNativeModule<SecureWindowNative>('SecureWindow');

/** Liga ou desliga o FLAG_SECURE (Recentes em branco, prints bloqueados). */
export async function setSecureWindow(on: boolean): Promise<void> {
  await native?.setSecure(on);
}
