package app.ciclolivre.securewindow

import android.view.WindowManager
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Só o FLAG_SECURE na janela do app: miniatura em branco nos Recentes e prints/gravação bloqueados.
 * Sem observar capturas de tela (não precisa da permissão DETECT_SCREEN_CAPTURE).
 */
class SecureWindowModule : Module() {
  private var secure = false

  private fun apply() {
    val window = appContext.currentActivity?.window ?: return
    if (secure) window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
    else window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
  }

  override fun definition() = ModuleDefinition {
    Name("SecureWindow")

    AsyncFunction("setSecure") { on: Boolean ->
      secure = on
      apply()
    }.runOnQueue(Queues.MAIN)

    // A janela pode ser recriada: reaplica ao voltar.
    OnActivityEntersForeground { appContext.currentActivity?.runOnUiThread { apply() } }
  }
}
