import { Panel } from './Panel';

const FAQ: { q: string; a: JSX.Element }[] = [
  {
    q: 'My stretched resolution still has black bars.',
    a: (
      <>
        <p>
          Qres sets the resolution. Whether the picture is stretched across the panel or letterboxed is your
          GPU's scaling setting, and no app can change that for you.
        </p>
        <p>
          <strong>NVIDIA:</strong> Control Panel → Adjust desktop size and position → Scaling: <code>Full-screen</code>,
          Perform scaling on: <code>GPU</code>, and tick "Override the scaling mode set by games and programs".
          <br />
          <strong>AMD:</strong> Adrenalin → Display → GPU Scaling <code>On</code>, Scaling Mode <code>Full panel</code>.
          <br />
          <strong>Intel:</strong> Graphics Command Center → Display → Scale: <code>Full Screen</code>.
        </p>
      </>
    ),
  },
  {
    q: "A resolution I want isn't in the list.",
    a: (
      <>
        <p>
          The grid only lists modes your display actually reports. Anything marked with an amber dot is a suggestion
          your display did not advertise - clicking it still tries, and Windows will refuse if the driver will not
          take it.
        </p>
        <p>
          To make one real, add a custom resolution in your GPU control panel (NVIDIA: Change resolution → Customize →
          Create Custom Resolution) and Qres picks it up on the next refresh.
        </p>
      </>
    ),
  },
  {
    q: 'What does "Highest available" do to refresh rate?',
    a: (
      <p>
        It asks the display for the fastest rate it supports <em>at that resolution</em>, so dropping to 1440×1080 keeps
        your 240 Hz instead of silently falling back to 60. Pick a specific rate if you would rather pin it.
      </p>
    ),
  },
  {
    q: 'Can this get me banned?',
    a: (
      <p>
        No. Qres calls <code>ChangeDisplaySettingsEx</code> - the same Windows API the Settings app uses. Nothing is
        injected, no game memory is read, no input is synthesised. The global hotkey uses Electron's standard
        registration, which is an OS-level key reservation, not a keyboard hook.
      </p>
    ),
  },
  {
    q: 'My screen went black after a change.',
    a: (
      <p>
        Wait 15 seconds - Qres puts the old mode back on its own if you never confirm. That guard runs on changes
        made in the window; hotkey and game-profile switches skip it so a dialog never lands on top of your game.
      </p>
    ),
  },
  {
    q: 'Does the resolution survive a reboot?',
    a: (
      <p>
        Yes, by default: the mode is written to the registry like any normal display change. Turn off
        <em> Remember across reboots</em> in Settings if you would rather every change be temporary.
      </p>
    ),
  },
  {
    q: 'Which monitor does it change?',
    a: (
      <p>
        Whatever the picker at the top says. <code>Auto</code> means the monitor your mouse is on at the moment you press
        the hotkey, which is usually the one you are playing on.
      </p>
    ),
  },
  {
    q: 'Where does it keep my settings?',
    a: (
      <p>
        <code>%APPDATA%\Qres\qres.json</code>. The small display helper it builds on first run is cached in
        <code>%LOCALAPPDATA%\Qres\bin</code>. Deleting either is safe - both are rebuilt.
      </p>
    ),
  },
];

export function FaqPanel({ onBack }: { onBack: () => void }) {
  return (
    <Panel title="FAQ" onBack={onBack}>
      {FAQ.map((item) => (
        <div className="faq-item" key={item.q}>
          <div className="faq-q">{item.q}</div>
          <div className="faq-a">{item.a}</div>
        </div>
      ))}
    </Panel>
  );
}
