const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
const nativewindConfig = withNativewind(config);

// react-native-css 3.1.0-rc.0 troca `import "react-native"` por uma lista fixa
// de exports que não inclui `AssetRegistry` (RN 0.88). Pacotes que usam o
// registro de assets precisam do react-native original, senão fontes e imagens
// quebram (ex.: ícones `md` das abas via expo-font -> expo-asset).
const NEEDS_ORIGINAL_RN = /[\\/]node_modules[\\/](expo-asset|expo-image)[\\/]/;
const nativewindResolve = nativewindConfig.resolver.resolveRequest;

nativewindConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react-native" && NEEDS_ORIGINAL_RN.test(context.originModulePath)) {
    return context.resolveRequest(context, moduleName, platform);
  }
  return nativewindResolve(context, moduleName, platform);
};

module.exports = nativewindConfig;
