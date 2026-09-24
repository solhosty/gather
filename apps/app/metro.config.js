const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Privy documents this package-specific condition override: jose has browser
// and Node exports but no react-native export, so use its browser build when
// Metro resolves the package for native platforms.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if ((platform === 'ios' || platform === 'android') && moduleName === 'jose') {
    const browserContext = {
      ...context,
      unstable_conditionNames: ['browser'],
    };
    return browserContext.resolveRequest(browserContext, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
