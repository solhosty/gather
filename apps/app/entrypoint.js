// Privy's React Native SDK requires these globals before Expo Router imports
// the app and initializes the native provider.
import 'fast-text-encoding';
import 'react-native-get-random-values';
import '@ethersproject/shims';

import 'expo-router/entry';
