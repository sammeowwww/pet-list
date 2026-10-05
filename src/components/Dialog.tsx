import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { isolateDialog, lockPageScroll } from './dialogEnvironment';

export default function Dialog({ title, children, onClose, wide = false, touchFocus = 'control' }: {
  title: string; children: ReactNode; onClose: () => void; wide?: boolean; touchFocus?: 'control' | 'dialog';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const restoreBackground = isolateDialog(dialog);
    const restoreScroll = lockPageScroll();
    dialog.showModal();
    const focusTarget = touchFocus === 'dialog' && window.matchMedia('(pointer: coarse)').matches ? dialog : dialog.querySelector<HTMLElement>('[data-autofocus]');
    focusTarget?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      restoreBackground();
      restoreScroll();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [touchFocus]);
  function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, a[href], [tabindex="0"]')].filter(element => element.getClientRects().length > 0);
    const target = event.shiftKey ? controls.at(-1) : controls[0];
    const boundary = event.shiftKey ? controls[0] : controls.at(-1);
    if (document.activeElement === boundary || !controls.length) { event.preventDefault(); target?.focus(); }
  }
  return <dialog ref={ref} tabIndex={-1} aria-modal="true" className={`dialog ${wide ? 'wide' : ''}`} onKeyDown={trapFocus} onCancel={onClose} aria-label={title}>
    <header className="dialog-heading"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></header>
    {children}
  </dialog>;
}
