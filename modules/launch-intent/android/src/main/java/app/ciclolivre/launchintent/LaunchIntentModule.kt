package app.ciclolivre.launchintent

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Só a ação do intent que abriu (ou reabriu) o app: o Health Connect abre o app pela ação de
 * "política de privacidade", sem URL. Nenhum extra ou dado do intent é lido.
 */
class LaunchIntentModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LaunchIntent")

    Events("onIntent")

    // Lê uma vez só: a ação é apagada do intent para não reabrir a política se o JS remontar.
    Function("consumeLaunchAction") {
      val intent = appContext.currentActivity?.intent
      val action = intent?.action
      if (action != null && action != android.content.Intent.ACTION_MAIN) intent.action = android.content.Intent.ACTION_MAIN
      action
    }

    OnNewIntent { intent ->
      sendEvent("onIntent", mapOf("action" to intent.action))
    }
  }
}
