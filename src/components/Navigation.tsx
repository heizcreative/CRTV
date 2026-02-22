import type { AppView } from '../types/trade';
import { LayoutDashboard, BookOpen, PlusCircle, BarChart2, Settings } from 'lucide-react';

interface NavigationProps {
  current: AppView;
  onChange: (view: AppView) => void;
}

const NAV_ITEMS: { view: AppView; icon: typeof LayoutDashboard; label: string }[] = [
  { view: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { view: 'journal', icon: BookOpen, label: 'Journal' },
  { view: 'add-trade', icon: PlusCircle, label: 'Add' },
  { view: 'analytics', icon: BarChart2, label: 'Analytics' },
  { view: 'settings', icon: Settings, label: 'Settings' },
];

export function Navigation({ current, onChange }: NavigationProps) {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(({ view, icon: Icon, label }) => (
        <button
          key={view}
          className={`nav-item${current === view ? ' nav-item--active' : ''}`}
          onClick={() => onChange(view)}
          aria-label={label}
        >
          <Icon size={20} strokeWidth={current === view ? 1.8 : 1.5} />
          <span className="nav-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
