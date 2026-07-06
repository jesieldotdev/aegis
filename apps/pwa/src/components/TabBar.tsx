import type { ReactNode } from 'react';
import { AegisLogo, IconClock, IconGear, IconNote, IconSliders, IconVaultDial } from '@aegis/ui';
import { useApp, type Tab } from '../store';

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'vault', label: 'Cofre', icon: <IconVaultDial size={24} /> },
  { id: '2fa', label: '2FA', icon: <IconClock size={24} strokeWidth={1.9} /> },
  { id: 'notes', label: 'Notas', icon: <IconNote size={24} /> },
  { id: 'gen', label: 'Gerador', icon: <IconSliders size={24} /> },
  { id: 'settings', label: 'Ajustes', icon: <IconGear size={24} /> },
];

export function TabBar() {
  const { tab, setTab } = useApp();

  return (
    <nav className="tabbar">
      <div className="tabbar-brand" aria-hidden>
        <AegisLogo size={34} iconSize={18} radius={11} />
        <span>Aegis</span>
      </div>
      {TABS.map((t) => (
        <button
          type="button"
          key={t.id}
          className={`tabbar-item${tab === t.id ? ' tabbar-item--active' : ''}`}
          onClick={() => setTab(t.id)}
        >
          {t.icon}
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
