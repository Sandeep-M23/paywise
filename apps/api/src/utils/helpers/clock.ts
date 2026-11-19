/** "Today" as an ISO date. Injected so date rules are testable without a real clock. */
export type Clock = { today: () => string };

export const systemClock: Clock = { today: () => new Date().toISOString().slice(0, 10) };

export const fixedClock = (today: string): Clock => ({ today: () => today });
