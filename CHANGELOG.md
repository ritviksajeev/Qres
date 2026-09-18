# Changelog

## 1.0.3

- Hotkeys are captured, not picked from a list: click the field and press the combination you want
- Monitors can be renamed, keyed on hardware id so the name survives a replug
- The window's X now hides to the tray and minimise behaves normally; quitting moved to the tray
- The tray menu is drawn by the app, so it carries the theme instead of being a grey Windows menu
- Uninstall from Settings → Danger zone, including the settings file and the cached display helper
- Removed the translucent window
- Title-bar lockup: the mark is centred on the wordmark and the version sits on its baseline

## 1.0.0

First release.

- Quick resolution grid built from the modes the display actually reports
- Global hotkey toggle between a native and a stretched mode
- Extra hotkeys bound to a single resolution
- Refresh rate per change, with *Highest available* picking the fastest rate for that resolution
- Per-monitor targeting, including `Auto` for the monitor under the cursor
- Game profiles: switch on a process launching, revert when it exits
- 15-second revert guard on changes made in the window
- Custom resolution entry with driver validation
- Tray menu with the current mode and both toggle targets
- Start with Windows, start minimised, close to tray
- Translucent acrylic window on Windows 11, with every surface as a frosted layer
- Light and dark themes
- Update check against GitHub releases
