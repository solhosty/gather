import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PrivyRoot } from '../auth/PrivyRoot';

export default function RootLayout() {
  return (
    <PrivyRoot>
      <StatusBar style="dark" />
      <Slot />
    </PrivyRoot>
  );
}
