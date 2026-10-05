/** Keep only the modal's ancestor branch interactive, including on touch browsers. */
export function isolateDialog(dialog: HTMLDialogElement): () => void {
  const background = new Map<HTMLElement, boolean>();
  let branch: HTMLElement = dialog;
  while (branch.parentElement) {
    for (const sibling of branch.parentElement.children) {
      if (sibling instanceof HTMLElement && sibling !== branch) {
        background.set(sibling, sibling.inert);
        sibling.inert = true;
      }
    }
    branch = branch.parentElement;
    if (branch === document.body) break;
  }
  return () => { for (const [element, inert] of background) element.inert = inert; };
}

/** A fixed body also stops iOS background scrolling; the dialog scrolls independently. */
export function lockPageScroll(): () => void {
  const { scrollX, scrollY } = window;
  const body = document.body;
  const previous = { position: body.style.position, top: body.style.top, left: body.style.left, width: body.style.width, overflow: body.style.overflow };
  const rootOverflow = document.documentElement.style.overflow;
  Object.assign(body.style, { position: 'fixed', top: `${-scrollY}px`, left: `${-scrollX}px`, width: '100%', overflow: 'hidden' });
  document.documentElement.style.overflow = 'hidden';
  return () => {
    Object.assign(body.style, previous);
    document.documentElement.style.overflow = rootOverflow;
    window.scrollTo(scrollX, scrollY);
  };
}
