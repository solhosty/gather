import { useCallback, useState, type ComponentType, type ReactNode } from 'react';
import { SheetHost } from '@roundup/ui';
import { PrivacyDialog, ProfileDialog, SettingsDialog, SourcesDialog } from './AccountDialogs';
import { DialogContext, type DialogName } from './context';
import { ApprovalDialog, FundConfirmDialog, FundDialog, ReceiveDialog, ReviewDialog, RoundupsDialog } from './MoneyDialogs';

const registry: Record<DialogName, ComponentType> = {
  settings: SettingsDialog,
  sources: SourcesDialog,
  profile: ProfileDialog,
  privacy: PrivacyDialog,
  fund: FundDialog,
  fundConfirm: FundConfirmDialog,
  receive: ReceiveDialog,
  roundups: RoundupsDialog,
  review: ReviewDialog,
  approval: ApprovalDialog,
};

export function DialogProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<DialogName>();
  const open = useCallback((name: DialogName) => setCurrent(name), []);
  const close = useCallback(() => setCurrent(undefined), []);
  const Active = current ? registry[current] : undefined;
  return (
    <DialogContext.Provider value={{ open, close, current }}>
      {children}
      <SheetHost visible={Boolean(Active)} onClose={close}>
        {Active ? <Active key={current} /> : null}
      </SheetHost>
    </DialogContext.Provider>
  );
}
