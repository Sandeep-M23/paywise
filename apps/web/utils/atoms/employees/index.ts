import { atom } from "jotai";

/*
 * Jotai holds transient UI state. Directory filters live in the URL instead
 * (see hooks/useDirectoryQuery.ts) so a filtered view can be shared or reloaded;
 * keeping them in atoms too would mean two sources of truth.
 */

/** Employee shown in the detail panel. */
export const selectedEmployeeIdAtom = atom<string | null>(null);
