'use strict';

// The whole renderer surface. Nothing else crosses the bridge.

const { contextBridge, ipcRenderer } = require('electron');

const listen = (channel) => (handler) => {
  const wrapped = (_event, payload) => handler(payload);
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
};

contextBridge.exposeInMainWorld('qres', {
  getState: () => ipcRenderer.invoke('qr:get-state'),
  refreshDisplays: () => ipcRenderer.invoke('qr:refresh-displays'),

  apply: (payload) => ipcRenderer.invoke('qr:apply', payload),
  toggle: () => ipcRenderer.invoke('qr:toggle'),
  restoreDefaults: () => ipcRenderer.invoke('qr:restore'),

  set: (key, value) => ipcRenderer.invoke('qr:set', { key, value }),

  keepChanges: () => ipcRenderer.invoke('qr:confirm-keep'),
  revertChanges: () => ipcRenderer.invoke('qr:confirm-revert'),

  checkUpdates: () => ipcRenderer.invoke('qr:check-updates'),

  uninstallPlan: () => ipcRenderer.invoke('qr:uninstall-plan'),
  uninstallRun: () => ipcRenderer.invoke('qr:uninstall-run'),
  quit: () => ipcRenderer.invoke('qr:quit'),

  trayMenuGet: () => ipcRenderer.invoke('qr:tray-menu-get'),
  trayMenuSize: (width, height) => ipcRenderer.invoke('qr:tray-menu-size', { width, height }),
  trayMenuAction: (id) => ipcRenderer.invoke('qr:tray-menu-action', id),
  trayMenuClose: () => ipcRenderer.invoke('qr:tray-menu-close'),
  onTrayMenuModel: listen('qr:tray-menu-model'),
  openExternal: (url) => ipcRenderer.invoke('qr:open-external', url),
  window: (action) => ipcRenderer.invoke('qr:window', action),

  onState: listen('qr:state'),
  onApplied: listen('qr:applied'),
  onToast: listen('qr:toast'),
  onRevertOpen: listen('qr:revert-open'),
  onRevertClosed: listen('qr:revert-closed'),
  onHotkeyState: listen('qr:hotkey-state'),
  onProfileEvent: listen('qr:profile-event'),
});
