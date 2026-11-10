const OPT_OUT = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']);
const OPT_IN = new Set(['START', 'UNSTOP']);

function normaliseWholeMessage(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toUpperCase();
}

export function detectOptOut(text: string): boolean {
  return OPT_OUT.has(normaliseWholeMessage(text));
}

export function detectOptIn(text: string): boolean {
  return OPT_IN.has(normaliseWholeMessage(text));
}
