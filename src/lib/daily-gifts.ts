// Opens the weekly gifts chain (DailyRewards, in the header) from anywhere in the app, e.g. the
// subscription card: day 7 of the chain is the only way to get Care+ while payment is off.
type Listener = () => void;
const listeners = new Set<Listener>();

export function openDailyGifts() {
  listeners.forEach((listener) => listener());
}

export function onOpenDailyGifts(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
