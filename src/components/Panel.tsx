import type { ReactNode } from 'react';
import { Back } from './Icons';

interface PanelProps {
  title: string;
  onBack: () => void;
  action?: ReactNode;
  children: ReactNode;
}

export function Panel({ title, onBack, action, children }: PanelProps) {
  return (
    <div className="panel">
      <div className="panel-head">
        <button className="btn icon" onClick={onBack} aria-label="Back"><Back /></button>
        <span className="panel-title">{title}</span>
        {action}
      </div>
      <div className="panel-body">{children}</div>
    </div>
  );
}
