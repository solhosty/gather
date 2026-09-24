import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { color, radius, space } from './theme';

// One modal host whose content can change keeps chained dialogs reliable on
// iOS, where presenting a second Modal while the first dismisses is dropped.
export function SheetHost({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable accessibilityLabel="Close dialog" style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.dialog} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={styles.body} bounces={false} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={onClose} style={styles.close}>
            <Text style={styles.closeLabel}>×</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function SheetContent({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <>
      <Text variant="eyebrow">{eyebrow}</Text>
      <Text variant="heading" style={styles.title}>{title}</Text>
      {children}
    </>
  );
}

export function Sheet({ visible, onClose, eyebrow, title, children }: { visible: boolean; onClose: () => void; eyebrow: string; title: string; children: ReactNode }) {
  return (
    <SheetHost visible={visible} onClose={onClose}>
      <SheetContent eyebrow={eyebrow} title={title}>{children}</SheetContent>
    </SheetHost>
  );
}

const styles = StyleSheet.create({
  scrim: { alignItems: 'center', backgroundColor: color.scrim, flex: 1, justifyContent: 'center', padding: 18 },
  dialog: { backgroundColor: color.card, borderColor: color.outline, borderRadius: radius.lg + 1, borderWidth: 2, boxShadow: `0px 7px 0px ${color.buttonShadow}`, maxHeight: '88%', maxWidth: 445, width: '100%' },
  body: { padding: 26, paddingTop: 28 },
  title: { fontSize: 26, lineHeight: 30, marginBottom: space.sm, marginTop: 9, paddingRight: 24 },
  close: { position: 'absolute', right: 16, top: 10 },
  closeLabel: { color: color.muted, fontSize: 26 },
});
