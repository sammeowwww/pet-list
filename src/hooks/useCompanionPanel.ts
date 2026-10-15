import { useState } from 'react';

const COLLAPSED_KEY = 'petlist:companions:collapsed';

function savedCollapseChoice(): boolean {
  try { return localStorage.getItem(COLLAPSED_KEY) === 'true'; }
  catch { return false; }
}

export function useCompanionPanel() {
  const [collapsed, setCollapsed] = useState(savedCollapseChoice);

  function changeVisibility(next: boolean) {
    setCollapsed(next);
    try { localStorage.setItem(COLLAPSED_KEY, String(next)); }
    catch { /* The panel still works without local storage. */ }
  }

  function show() {
    changeVisibility(false);
    const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    document.getElementById('companion-panel')?.scrollIntoView({ behavior, block: 'start' });
  }

  return { collapsed, toggle: () => changeVisibility(!collapsed), show };
}
