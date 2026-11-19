import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { Express } from "express";

/**
 * Serves an Express app on a free loopback port, so route tests call
 * `app.request(path, init)` and assert on a real fetch Response (status,
 * headers, raw bytes). Nothing leaves the machine.
 */
export async function serve(app: Express) {
  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const { port } = server.address() as AddressInfo;
  return {
    request: (path: string, init?: RequestInit) => fetch(`http://127.0.0.1:${port}${path}`, init),
    close: () =>
      new Promise<void>((resolve, reject) => {
        // fetch keeps connections alive; close them or the server never stops.
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

export type TestServer = Awaited<ReturnType<typeof serve>>;
