package app.ciclolivre.appicon

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Nomes do JS (src/appearance/icons.ts) → activity-alias do plugin with-alternate-icons (conferido por teste). */
private val ALIASES = linkedMapOf(
  "padrao" to "MainActivityPadrao",
  "noite" to "MainActivityNoite",
  "sol" to "MainActivitySol",
  "discreto" to "MainActivityDiscreto",
)

/**
 * Troca o ícone ligando um alias e desligando os outros. A troca só acontece quando a pessoa sai do app
 * (Home ou Recentes) ou a tela é destruída: não durante telas do sistema abertas pelo app (compartilhar,
 * PIN, permissões), em que desligar o alias da tarefa pode fechar o app no meio da ação.
 */
class AppIconModule : Module() {
  private var pending: String? = null

  private val context: Context? get() = appContext.reactContext

  private fun component(ctx: Context, alias: String) = ComponentName(ctx.packageName, "${ctx.packageName}.$alias")

  /** Ícone ligado agora no launcher (null sem contexto). */
  private fun current(): String? {
    val ctx = context ?: return null
    val pm = ctx.packageManager
    for ((name, alias) in ALIASES) {
      val state = pm.getComponentEnabledSetting(component(ctx, alias))
      val enabled = state == PackageManager.COMPONENT_ENABLED_STATE_ENABLED ||
        (state == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT && name == "padrao")
      if (enabled) return name
    }
    return "padrao"
  }

  private fun apply() {
    val target = pending ?: return
    val ctx = context ?: return
    pending = null
    if (target == current()) return
    val pm = ctx.packageManager
    // Liga o novo antes de desligar os outros: nunca fica sem ícone no launcher.
    pm.setComponentEnabledSetting(component(ctx, ALIASES.getValue(target)), PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP)
    for ((name, alias) in ALIASES) {
      if (name != target) {
        pm.setComponentEnabledSetting(component(ctx, alias), PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP)
      }
    }
    applySplash(target)
  }

  /** Android 13+: com o ícone discreto, a abertura também fica neutra (sem os lobos). */
  private fun applySplash(target: String) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
    val activity = appContext.currentActivity ?: return
    val style = if (target == "discreto") {
      activity.resources.getIdentifier("DiscreetSplash", "style", activity.packageName)
    } else 0
    activity.splashScreen.setSplashScreenTheme(style)
  }

  override fun definition() = ModuleDefinition {
    Name("AppIcon")

    /** O escolhido (pendente ou já aplicado). */
    Function("getIcon") { pending ?: current() }

    /** O que o launcher mostra agora. */
    Function("getActiveIcon") { current() }

    Function("setIcon") { name: String ->
      require(ALIASES.containsKey(name)) { "Ícone desconhecido" }
      pending = name
    }

    OnUserLeavesActivity { apply() }
    OnActivityDestroys { apply() }
  }
}
