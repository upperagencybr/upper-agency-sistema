import { createServerFn } from "@tanstack/react-start";
import { getRequestHost as incomingHost } from "@tanstack/react-start/server";
import { normalizeHost } from "./site";

/** The address the visitor actually typed, read on the server. */
export const getRequestHost = createServerFn({ method: "GET" }).handler(async () =>
  normalizeHost(incomingHost({ xForwardedHost: true })),
);
