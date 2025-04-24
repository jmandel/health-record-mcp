import { useSyncExternalStore, useCallback } from "react";
import { sessions } from "../core/registry";
import type { PaSession } from "../core/PaSession";

export function usePaSession(taskId: string | null | undefined): PaSession | null {
  const validTaskId = taskId || ""; 
  
  // Subscribe function (simplified slightly)
  const subscribe = useCallback((callback: () => void) => {
    const session = sessions.get(validTaskId);
    // session?.subscribe returns the unsubscribe function or undefined if no session
    return session?.subscribe(callback) ?? (() => {}); // Return empty unsubscribe if no session
  }, [validTaskId]); 

  // getSnapshot now includes the updateCounter, scratchpad length, 
  // artifact count, and approval status.
  const getSnapshot = useCallback(() => {
      const session = sessions.get(validTaskId);
      // Combine counter and other relevant counts/flags into a snapshot value
      return (
          `${session?.updateCounter ?? -1}-` +
          `${session?.scratchpad?.length ?? 0}-` +
          `${session?.artifacts?.length ?? 0}-` + 
          `${!!session?.approvalData}` // Add boolean flag for approval data existence
      );
  }, [validTaskId]); 

  // Use useSyncExternalStore with the counter as the snapshot
  useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot // Server snapshot can be the same here
  );

  // Return the LATEST session instance directly
  const currentSession = sessions.get(validTaskId) || null;
  return currentSession;
}
