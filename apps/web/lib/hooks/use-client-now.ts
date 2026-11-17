import { useSyncExternalStore } from "react";

let now: Date | null = null;
const subscribe = () => () => {};

/**
 * The current time, read in the browser only. Pages are prerendered (Cache
 * Components), so reading the clock during render would bake the build
 * time into the HTML; on the server this returns null instead.
 */
export function useClientNow(): Date | null {
  return useSyncExternalStore(
    subscribe,
    () => (now ??= new Date()),
    () => null,
  );
}
