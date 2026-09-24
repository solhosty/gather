import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Text, color, useLayout } from '@roundup/ui';
import { useAccount } from '../../account/AccountProvider';
import { useDialogs } from '../../dialogs/context';
import { usePlanSummary } from '../../features/usePlanSummary';
import { Screen } from '../../shell/Screen';

type Step = { key: string; label: string; title: string; detail: string; done: boolean; action?: { label: string; onPress: () => void } };

export default function OnboardingScreen() {
  const { settings } = useAccount();
  const { open } = useDialogs();
  const { isWide } = useLayout();
  const plan = usePlanSummary();

  const steps: Step[] = [
    { key: 'profile', label: 'About you', title: 'Profile', detail: 'Set your name and home currency.', done: Boolean(settings.profile?.displayName), action: { label: 'Edit', onPress: () => open('profile') } },
    { key: 'source', label: 'Spending source', title: 'Connect a bank or wallet', detail: 'Read transactions only. You choose what counts as a roundup.', done: plan.bankCount > 0, action: { label: 'Connect', onPress: () => open('sources') } },
    { key: 'mix', label: 'Portfolio', title: 'Pick your target mix', detail: 'Set stocks and percentages before money moves.', done: plan.mix.length > 0, action: { label: 'Choose mix', onPress: () => router.navigate('/plan') } },
    { key: 'fund', label: 'Funding', title: 'Add USDC', detail: 'Buy, swap, or receive USDC into your chosen wallet.', done: plan.testUsdcCents > 0, action: { label: 'Add USDC', onPress: () => open('fund') } },
  ];
  const activeIndex = steps.findIndex((step) => !step.done);
  const currentStep = activeIndex === -1 ? steps.length : activeIndex + 1;

  return (
    <Screen kicker="Getting started" title="Build your investing loop.">
      <View style={styles.head}>
        <Text variant="eyebrow">Getting started · {currentStep} of {steps.length}</Text>
        <Text variant="heading" style={[styles.headTitle, !isWide && styles.headTitleNarrow]}>
          {activeIndex === -1 ? 'Your investing loop is set up.' : 'Set up your investing loop.'}
        </Text>
        <Text variant="body">It takes a connected source, a wallet, and a mix you choose.</Text>
      </View>
      <View style={styles.grid}>
        {steps.map((step, index) => {
          const active = index === activeIndex;
          return (
            <Card key={step.key} style={[styles.step, !isWide && styles.stepNarrow, active && styles.stepActive]}>
              <View style={[styles.number, step.done && styles.numberDone]}>
                <Text style={[styles.numberText, step.done && styles.numberTextDone]}>{step.done ? '✓' : index + 1}</Text>
              </View>
              <View style={styles.copy}>
                <Text variant="eyebrow">{step.label}</Text>
                <Text variant="subtitle" style={styles.title}>{step.title}</Text>
                <Text variant="caption" style={styles.detail}>{step.detail}</Text>
                {!isWide && step.action && (active || step.done) ? (
                  <Button label={step.done ? 'Edit' : step.action.label} variant={active ? 'primary' : 'text'} onPress={step.action.onPress} style={styles.narrowAction} />
                ) : null}
              </View>
              {isWide && step.action && (active || step.done) ? (
                <Button label={step.done ? 'Edit' : step.action.label} variant={active ? 'primary' : 'text'} onPress={step.action.onPress} />
              ) : null}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { marginBottom: 23, marginTop: 5, maxWidth: 550 },
  headTitle: { fontSize: 30, lineHeight: 34, marginVertical: 8 },
  headTitleNarrow: { fontSize: 25, lineHeight: 29 },
  grid: { gap: 10, maxWidth: 700 },
  step: { alignItems: 'center', flexDirection: 'row', gap: 13, padding: 18 },
  stepNarrow: { alignItems: 'flex-start' },
  stepActive: { backgroundColor: '#F7FCF8', borderColor: '#8EBBA6' },
  number: { alignItems: 'center', backgroundColor: '#EDF0EA', borderRadius: 14, height: 28, justifyContent: 'center', width: 28 },
  numberDone: { backgroundColor: color.accentLight },
  numberText: { fontSize: 12, fontWeight: '600' },
  numberTextDone: { color: color.accent },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, marginTop: 4 },
  detail: { marginTop: 4 },
  narrowAction: { alignSelf: 'flex-start', marginTop: 10 },
});
