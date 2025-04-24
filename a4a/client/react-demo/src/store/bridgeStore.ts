import { create, StateCreator } from 'zustand';
import { ConditionNode } from '../types/priorAuthTypes';

// Add 'fetching-policy' and 'submitting'
export type UiMode = 'idle' | 'fetching-policy' | 'collecting' | 'submitting' | 'done' | 'error';

export interface BridgeStore {
  uiMode: UiMode;
  criteriaTree?: ConditionNode;                  // populated on SUCCESS
  remoteDecision?: 'Approved'|'Denied'|'CannotApprove';

  // setters
  setUiMode: (m: UiMode) => void;
  setCriteriaTree: (c: ConditionNode | undefined) => void; // Allow undefined for reset
  setRemoteDecision: (d: BridgeStore['remoteDecision']) => void;
  reset: () => void;
}

export const useBridgeStore = create<BridgeStore>((set) => ({
  uiMode: 'idle',
  criteriaTree: undefined,
  remoteDecision: undefined,

  setUiMode: (m: UiMode) => set({ uiMode: m }),
  setCriteriaTree: (c: ConditionNode | undefined) => set({ criteriaTree: c }),
  setRemoteDecision: (d: BridgeStore['remoteDecision']) => set({ remoteDecision: d }),
  reset: () => set({ uiMode: 'idle', criteriaTree: undefined, remoteDecision: undefined }),
}));
