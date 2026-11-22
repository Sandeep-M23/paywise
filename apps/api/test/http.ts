import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { Express } from "express";

export async function serve(app: Express) {
  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const { port } = server.address() as AddressInfo;
  return {
    request: (path: string, init?: RequestInit) => fetch(`http://127.0.0.1:${port}${path}`, init),
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

export type TestServer = Awaited<ReturnType<typeof serve>>;
