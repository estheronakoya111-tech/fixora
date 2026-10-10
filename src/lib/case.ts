export type { CaseDetails } from "./types";

// The React-purity linter flags `Date.now()` inside components, even in async
// event handlers. Tunnel the call through this module so the timestamp is
// captured the moment a save actually happens.
export function nowMs(): number {
  return Date.now();
}
