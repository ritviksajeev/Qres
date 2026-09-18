import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { qr } from './lib/ipc';
import { Mark } from './components/Icons';
import type { TrayMenuModel } from './lib/types';

/**
 * The tray's right-click menu. It is a window rather than an Electron Menu
 * because the OS draws those itself, and a grey Windows context menu hanging
 * off the app is the one surface the theme could not reach.
 */
export default function TrayMenu() {
  const [model, setModel] = useState<TrayMenuModel | null>(null);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void qr.trayMenuGet().then((next) => { if (next) setModel(next); });
    return qr.onTrayMenuModel(setModel);
  }, []);

  useEffect(() => {
    if (model) document.documentElement.dataset.theme = model.theme;
  }, [model]);

  // Report the size React actually laid out, so the window fits the menu
  // rather than the menu being squeezed into a guessed window.
  useLayoutEffect(() => {
    if (!card.current) return;
    const rect = card.current.getBoundingClientRect();
    void qr.trayMenuSize(Math.ceil(rect.width) + 16, Math.ceil(rect.height) + 16);
  }, [model]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') void qr.trayMenuClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!model) return <div className="traymenu-root" />;

  return (
    <div className="traymenu-root">
      <div className="traymenu" ref={card}>
        {model.items.map((item, index) => {
          if (item.type === 'separator') return <div className="traymenu-sep" key={`sep-${index}`} />;

          if (item.type === 'header') {
            return (
              <div className="traymenu-head" key={`head-${index}`}>
                <span className="traymenu-mark"><Mark height={11} /></span>
                <span className="traymenu-head-text">
                  <span className="traymenu-head-name">{item.label}</span>
                  <span className="traymenu-head-mode">{item.value}</span>
                </span>
              </div>
            );
          }

          return (
            <button
              key={item.id}
              className={`traymenu-item${item.accent ? ' accent' : ''}${item.danger ? ' danger' : ''}`}
              onClick={() => { void qr.trayMenuAction(item.id!); }}
            >
              <span className="traymenu-label">{item.label}</span>
              {item.value ? <span className="traymenu-value">{item.value}</span> : null}
              {item.hint ? <span className="traymenu-hint">{item.hint}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
