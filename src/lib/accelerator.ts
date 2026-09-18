// Turning a KeyboardEvent into an Electron accelerator string.
//
// Keyed off event.code rather than event.key, so the binding is the physical
// key: Shift+2 records as Shift+2, not Shift+@, and a non-US layout still
// resolves to the letter Electron expects.

const PUNCTUATION: Record<string, string> = {
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backquote: '`',
};

const NAMED: Record<string, string> = {
  Space: 'Space',
  Tab: 'Tab',
  Enter: 'Return',
  NumpadEnter: 'Return',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Insert: 'Insert',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Escape: 'Escape',
  PrintScreen: 'PrintScreen',
  ScrollLock: 'Scrolllock',
  Pause: 'Pause',
  NumpadAdd: 'numadd',
  NumpadSubtract: 'numsub',
  NumpadMultiply: 'nummult',
  NumpadDivide: 'numdiv',
  NumpadDecimal: 'numdec',
};

/** Keys safe to bind on their own - everything else would swallow typing. */
const STANDALONE = /^(F([1-9]|1\d|2[0-4])|Insert|PrintScreen|Pause|Scrolllock|num[0-9]|numadd|numsub|nummult|numdiv|numdec)$/;

const MODIFIER_CODES = /^(Control|Shift|Alt|Meta|OS)(Left|Right)?$/;

function keyName(code: string): string | null {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^Numpad[0-9]$/.test(code)) return `num${code.slice(6)}`;
  if (/^F([1-9]|1\d|2[0-4])$/.test(code)) return code;
  if (PUNCTUATION[code]) return PUNCTUATION[code];
  if (NAMED[code]) return NAMED[code];
  return null;
}

export interface Capture {
  accelerator: string | null;
  /** Set when the combination cannot be bound, with the reason to show. */
  problem: string | null;
}

export function capture(event: KeyboardEvent): Capture | null {
  // A modifier on its own is the user mid-chord, not a finished combination.
  if (MODIFIER_CODES.test(event.code)) return null;

  const key = keyName(event.code);
  if (!key) return { accelerator: null, problem: 'That key cannot be bound.' };

  const parts: string[] = [];
  if (event.ctrlKey) parts.push('Ctrl');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  if (event.metaKey) parts.push('Super');

  if (parts.length === 0 && !STANDALONE.test(key)) {
    return { accelerator: null, problem: `${key} on its own would swallow every press. Add Ctrl, Alt or Shift.` };
  }

  parts.push(key);
  return { accelerator: parts.join('+'), problem: null };
}

/** Splits an accelerator for display as individual keycaps. */
export function keysOf(accelerator: string): string[] {
  return accelerator ? accelerator.split('+') : [];
}
