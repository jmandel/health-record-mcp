import type { PaSession } from "./PaSession";

// Global registry for active PA sessions
export const sessions = new Map<string, PaSession>();
