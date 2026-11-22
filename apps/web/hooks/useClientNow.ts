import { useSyncExternalStore } from "react";

let now: Date | null = null;
const subscribe = () => () => {};

export function useClientNow(): Date | null {
  return useSyncExternalStore(
    subscribe,
    () => (now ??= new Date()),
    () => null,
  );
}
