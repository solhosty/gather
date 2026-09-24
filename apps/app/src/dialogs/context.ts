import { createContext, useContext } from 'react';

export type DialogName =
  | 'settings' | 'sources' | 'profile' | 'privacy'
  | 'fund' | 'fundConfirm' | 'receive' | 'roundups' | 'review' | 'approval';

export type DialogState = { open: (name: DialogName) => void; close: () => void; current: DialogName | undefined };
export const DialogContext = createContext<DialogState | undefined>(undefined);

export function useDialogs() {
  const value = useContext(DialogContext);
  if (!value) throw new Error('useDialogs must be used inside DialogProvider.');
  return value;
}
