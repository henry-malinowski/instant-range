declare global {
  /**
   * Settings typing used by `fvtt-types` for `game.settings.register/get/set`.
   * The keys here are full setting keys: `${namespace}.${key}`.
   */
  interface SettingConfig {
    "instant-range.hoverOnlyInCombat": boolean;
    "instant-range.refreshThrottleMs": number;
  }
}

declare namespace foundry {
  namespace canvas {
    namespace placeables {
      interface Token {
        /**
         * Internal preview clone used during drag operations.
         * @internal This is a private Foundry API that exists at runtime.
         * Prefer using `isPreview` property when possible.
         */
        _preview?: Token;
      }
    }
  }
}

export {};
