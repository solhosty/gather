const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const appPackage = path.join(__dirname, 'package.json');
const workspacePackages = path.resolve(__dirname, '../../packages') + path.sep;
const singletonModules = /^(react|react-dom|react-native|react-native-web)(\/.*)?$/;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Privy documents this package-specific condition override: jose has browser
  // and Node exports but no react-native export, so use its browser build when
  // Metro resolves the package for native platforms.
  if ((platform === 'ios' || platform === 'android') && moduleName === 'jose') {
    const browserContext = {
      ...context,
      unstable_conditionNames: ['browser'],
    };
    return browserContext.resolveRequest(browserContext, moduleName, platform);
  }

  // Shared workspace packages (packages/ui) must render with the app's single
  // React/React Native instance, including the web react-native-web alias.
  if (singletonModules.test(moduleName) && context.originModulePath.startsWith(workspacePackages)) {
    return context.resolveRequest({ ...context, originModulePath: appPackage }, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
