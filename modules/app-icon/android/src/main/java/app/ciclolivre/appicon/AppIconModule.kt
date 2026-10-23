package app.ciclolivre.appicon

import android.content.ComponentName
import android.content.pm.PackageManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Nomes do JS (src/appearance/icons.ts) → activity-alias do plugin with-alternate-icons. */
private val ALIASES = linkedMapOf(
  "padrao" to "MainActivityPadrao",
  "noite" to "MainActivityNoite",
  "sol" to "MainActivitySol",
  "discreto" to "MainActivityDiscreto",
)

/**
 * Troca o ícone ligando um alias e desligando os outros. A troca só acontece quando o app vai para o
 * segundo plano: desligar o alias que abriu a tarefa com o app na tela pode fechar o app.
 */
class AppIconModule : Module() {
  private var pending: String? = null

  private fun component(alias: String): ComponentName {
    val pkg = appContext.reactContext!!.packageName
    return ComponentName(pkg, "$pkg.$alias")
  }

  private fun current(): String {
    val pm = appContext.reactContext!!.packageManager
    for ((name, alias) in ALIASES) {
      val state = pm.getComponentEnabledSetting(component(alias))
      val enabled = state == PackageManager.COMPONENT_ENABLED_STATE_ENABLED ||
        (state == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT && name == "padrao")
      if (enabled) return name
    }
    return "padrao"
  }

  private fun apply() {
    val target = pending ?: return
    pending = null
    if (target == current()) return
    val pm = appContext.reactContext?.packageManager ?: return
    // Liga o novo antes de desligar os outros: nunca fica sem ícone no launcher.
    pm.setComponentEnabledSetting(component(ALIASES.getValue(target)), PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP)
    for ((name, alias) in ALIASES) {
      if (name != target) {
        pm.setComponentEnabledSetting(component(alias), PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP)
      }
    }
  }

  override fun definition() = ModuleDefinition {
    Name("AppIcon")

    Function("getIcon") { pending ?: current() }

    Function("setIcon") { name: String ->
      require(ALIASES.containsKey(name)) { "Ícone desconhecido" }
      pending = name
    }

    OnActivityEntersBackground { apply() }
  }
}
