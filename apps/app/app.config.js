const path = require('node:path');
const baseConfig = require('./app.json');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  expo: {
    ...baseConfig.expo,
    extra: {
      ...baseConfig.expo.extra,
      // The root .env is the canonical development configuration for every app.
      privyAppId: process.env.EXPO_PUBLIC_PRIVY_APP_ID,
      privyWebClientId: process.env.EXPO_PUBLIC_PRIVY_WEB_CLIENT_ID,
      privyIosClientId: process.env.EXPO_PUBLIC_PRIVY_IOS_CLIENT_ID,
    },
  },
};
