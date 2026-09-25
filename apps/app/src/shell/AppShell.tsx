import { forwardRef, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Text, color, font, layout, raised, useLayout, type IconName } from '@roundup/ui';
import { useAccount } from '../account/AccountProvider';
import { useDialogs } from '../dialogs/context';

const tabs: { name: string; href: '/' | '/activity' | '/portfolio' | '/plan'; label: string; icon: IconName }[] = [
  { name: 'index', href: '/', label: 'Home', icon: 'home' },
  { name: 'activity', href: '/activity', label: 'Activity', icon: 'activity' },
  { name: 'portfolio', href: '/portfolio', label: 'Portfolio', icon: 'portfolio' },
  { name: 'plan', href: '/plan', label: 'Plan', icon: 'plan' },
];

export function AppShell() {
  const { isWide } = useLayout();
  const insets = useSafeAreaInsets();

  return (
    <Tabs style={[styles.root, isWide ? styles.rootWide : styles.rootNarrow]}>
      <TabList style={isWide ? styles.sidebar : [styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {isWide ? <SidebarBrand /> : null}
        {tabs.map((tab) => (
          <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
            <NavItem label={tab.label} icon={tab.icon} wide={isWide} />
          </TabTrigger>
        ))}
        <TabTrigger name="settings" href="/settings" style={styles.hidden} />
        <TabTrigger name="onboarding" href="/onboarding" style={styles.hidden} />
        {isWide ? <ProfileButton /> : null}
      </TabList>
      <TabSlot style={styles.slot} />
    </Tabs>
  );
}

function SidebarBrand() {
  return (
    <View style={styles.brandBlock}>
      <Brand />
    </View>
  );
}

export function Brand() {
  return (
    <View style={styles.brand}>
      <View style={styles.brandMark}><Text style={styles.brandMarkText}>R</Text></View>
      <Text style={styles.brandName}>roundup</Text>
    </View>
  );
}

type NavItemProps = TabTriggerSlotProps & { label: string; icon: IconName; wide: boolean };

const NavItem = forwardRef<View, NavItemProps>(function NavItem({ isFocused, label, icon, wide, ...props }, ref) {
  return (
    <Pressable
      ref={ref}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: Boolean(isFocused) }}
      {...(props as ComponentProps<typeof Pressable>)}
      style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
        wide ? styles.navItem : styles.tabItem,
        hovered && !isFocused && styles.navHover,
        isFocused && (wide ? styles.navActive : styles.tabActive),
      ]}
    >
      <Icon name={icon} size={wide ? 18 : 21} color={isFocused ? color.accentInk : '#647069'} />
      {wide ? <Text style={[styles.navLabel, isFocused && styles.navLabelActive]}>{label}</Text> : null}
    </Pressable>
  );
});

function ProfileButton() {
  const { auth, settings } = useAccount();
  const { open } = useDialogs();
  const name = settings.profile?.displayName;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Account and settings"
      onPress={() => open('settings')}
      style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [styles.profile, hovered && styles.navHover]}
    >
      <View style={styles.avatar}><Text style={styles.avatarText}>{(name ?? 'R').charAt(0).toUpperCase()}</Text></View>
      <View style={styles.profileCopy}>
        <Text style={styles.profileName} numberOfLines={1}>{name ?? 'Your account'}</Text>
        <Text style={styles.profileDetail}>{auth.walletAddress ? '1 wallet · manage' : 'Creating wallet…'}</Text>
      </View>
      <View style={[styles.profileDot, !auth.walletAddress && styles.profileDotPending]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: color.paper, flex: 1 },
  rootWide: { flexDirection: 'row' },
  rootNarrow: { flexDirection: 'column-reverse' },
  slot: { flex: 1 },
  hidden: { display: 'none' },
  sidebar: { backgroundColor: color.sidebar, borderRightColor: '#9EAEA4', borderRightWidth: 1.5, flexDirection: 'column', gap: 4, justifyContent: 'flex-start', paddingBottom: 20, paddingHorizontal: 20, paddingTop: 20, width: layout.sidebarWidth },
  bottomBar: { backgroundColor: color.sidebar, borderTopColor: color.line, borderTopWidth: 1.5, flexDirection: 'row', gap: 4, paddingHorizontal: 14, paddingTop: 7 },
  brandBlock: { marginBottom: 6 },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  brandMark: { alignItems: 'center', backgroundColor: color.accent, borderColor: '#123C2B', borderRadius: 8, borderWidth: 1.5, boxShadow: '2px 2px 0px #B8D1C3', height: 27, justifyContent: 'center', transform: [{ rotate: '-1deg' }], width: 27 },
  brandMarkText: { color: color.onAccent, fontFamily: font.display, fontSize: 14, fontWeight: '700' },
  brandName: { color: color.ink, fontFamily: font.display, fontSize: 22, fontWeight: '700', letterSpacing: -0.9 },
  navItem: { alignItems: 'center', borderColor: 'transparent', borderRadius: 9, borderWidth: 1.5, flexDirection: 'row', gap: 11, paddingHorizontal: 12, paddingVertical: 9 },
  tabItem: { alignItems: 'center', borderColor: 'transparent', borderRadius: 11, borderWidth: 1.5, flex: 1, justifyContent: 'center', paddingVertical: 9 },
  navHover: { backgroundColor: color.soft },
  navActive: { backgroundColor: color.accentLight, borderColor: '#9CB9AA', boxShadow: '2px 2px 0px #D1E1D8' },
  tabActive: { backgroundColor: color.accentLight, borderColor: '#9CB9AA' },
  navLabel: { color: '#647069', fontSize: 14, fontWeight: '500' },
  navLabelActive: { color: color.accentInk, fontWeight: '600' },
  profile: { alignItems: 'center', borderRadius: 9, flexDirection: 'row', gap: 9, marginTop: 'auto', paddingHorizontal: 8, paddingVertical: 12 },
  avatar: { alignItems: 'center', backgroundColor: color.avatar, borderRadius: 15, height: 29, justifyContent: 'center', width: 29, ...raised('chip') },
  avatarText: { fontSize: 12, fontWeight: '700' },
  profileCopy: { flex: 1 },
  profileName: { fontSize: 13, fontWeight: '600' },
  profileDetail: { color: color.muted, fontSize: 10, fontWeight: '500', marginTop: 2 },
  profileDot: { backgroundColor: '#5AA273', borderRadius: 4, height: 7, width: 7 },
  profileDotPending: { backgroundColor: color.warningBorder },
});
