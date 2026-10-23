package app.ciclolivre.launchintent

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Só a ação do intent que abriu (ou reabriu) o app: o Health Connect abre o app pela ação de
 * "política de privacidade", sem URL. Nenhum extra ou dado do intent é lido.
 */
private val POLICY_ACTIONS = setOf(
  "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE",
  "android.intent.action.VIEW_PERMISSION_USAGE",
)

class LaunchIntentModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LaunchIntent")

    Events("onIntent")

    // Lê uma vez só: as ações do Health Connect são apagadas do intent para não reabrir a política se o JS remontar.
    // Qualquer outra ação (VIEW de deep link, MAIN) fica intacta: o Linking do RN só lê a URL inicial com ACTION_VIEW.
    Function("consumeLaunchAction") {
      val intent = appContext.currentActivity?.intent
      val action = intent?.action
      if (action != null && action in POLICY_ACTIONS) intent.action = android.content.Intent.ACTION_MAIN
      action
    }

    OnNewIntent { intent ->
      sendEvent("onIntent", mapOf("action" to intent.action))
    }
  }
}
