// Journal partage : ecrit dans logcat (tag ReactNativeJS) et peut etre affiche a l'ecran.
// Filtre utile : adb logcat ReactNativeJS:V *:S | grep VirtualPad

type Listener = (line: string) => void;

const listeners = new Set<Listener>();
const history: string[] = [];
const MAX_HISTORY = 200;

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function log(message: string): void {
  const line = `${timestamp()} ${message}`;
  // Visible via adb logcat (tag ReactNativeJS)
  console.log(`[VirtualPad] ${message}`);
  history.push(line);
  if (history.length > MAX_HISTORY) {
    history.shift();
  }
  listeners.forEach((listener) => listener(line));
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getHistory(): string[] {
  return [...history];
}