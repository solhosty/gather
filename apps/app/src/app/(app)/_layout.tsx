import { AccountProvider, useAccount } from '../../account/AccountProvider';
import { DialogProvider } from '../../dialogs/DialogProvider';
import { AppShell } from '../../shell/AppShell';
import { BootScreen, SignInScreen } from '../../shell/SignInScreen';

function Gate() {
  const { auth } = useAccount();
  if (!auth.isReady) return <BootScreen label="Preparing your secure sign-in" />;
  if (auth.authError) return <BootScreen label="Privy could not start. Check the app configuration and try again." error />;
  if (!auth.user) return <SignInScreen />;
  return (
    <DialogProvider>
      <AppShell />
    </DialogProvider>
  );
}

export default function AppLayout() {
  return (
    <AccountProvider>
      <Gate />
    </AccountProvider>
  );
}
