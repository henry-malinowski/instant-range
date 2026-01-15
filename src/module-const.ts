export const MODULE_ID = "instant-range" as const;

export interface InstantRangeSettings {
  hoverOnlyInCombat: boolean;
  refreshThrottleMs: number;
}

export const instantRangeState: {
  settings: InstantRangeSettings;
} = {
  settings: {
    hoverOnlyInCombat: false,
    refreshThrottleMs: 40,
  },
};
