/**
 * Type augmentations for the Health Estimate module integration.
 * Extracted from actual module usage patterns and the HealthEstimate class definition.
 * @see https://github.com/mclemente/healthEstimate
 */

/**
 * Position of the health estimate display relative to tokens.
 * Known values: "a" (above/left), "b" (center), "c" (right)
 */
type HealthEstimatePosition = "a" | "b" | "c";

/**
 * Break conditions object for controlling when estimates are displayed.
 */
interface HealthEstimateBreakConditions {
  /** Default break condition expression */
  default: string;
  /** System-specific break condition expression */
  system?: string;
  /** Condition for GM-only display */
  onlyGM?: string;
  /** Condition for non-GM-only display */
  onlyNotGM?: string;
  /** Condition for PC-only display */
  onlyPCs?: string;
  /** Condition for NPC-only display */
  onlyNPCs?: string;
}

/**
 * Estimate configuration object.
 */
interface HealthEstimateEstimate {
  /** The label text for this estimate stage */
  label: string;
  /** The health percentage threshold value */
  value: number;
}

/**
 * Estimation entry in the estimations array.
 */
interface HealthEstimateEstimation {
  /** Name of the estimation */
  name?: string;
  /** JavaScript rule for when this estimation applies */
  rule: string;
  /** Whether to ignore color for this estimation */
  ignoreColor?: boolean;
  /** Array of estimate stages */
  estimates: HealthEstimateEstimate[];
}

/**
 * Result from getTokenEstimate method.
 */
interface HealthEstimateTokenEstimateResult {
  /** The matched estimation */
  estimation: HealthEstimateEstimation;
  /** Special estimation if ignoreColor was set */
  special?: HealthEstimateEstimation;
}

/**
 * Result from getEstimation method.
 */
interface HealthEstimateEstimationResult {
  /** The description/label text to display */
  desc: string;
  /** The fill color */
  color: string;
  /** The stroke/outline color */
  stroke: string;
}

/**
 * Result from getStage method.
 */
interface HealthEstimateStageResult {
  /** The matched estimate */
  estimate: HealthEstimateEstimate;
  /** The index in the estimations array */
  index: number;
}

/**
 * Game-level configuration for Health Estimate module.
 * Accessed via `game.healthEstimate`.
 */
interface HealthEstimateGameConfig {
  /**
   * Position of health estimate display relative to tokens.
   * "a" = above/left, "b" = center, "c" = right
   */
  position: HealthEstimatePosition;

  /**
   * Whether to scale the health estimate based on grid size.
   * When true, scaling factor is calculated as `canvas.scene.dimensions.size / 100`.
   */
  scaleToGridSize: boolean;

  /**
   * Whether to scale the health estimate based on token size.
   * When true, scaling factor is the token's document width.
   */
  scaleToTokenSize: boolean;

  /**
   * Whether to scale the health estimate based on zoom level.
   */
  scaleToZoom: boolean;

  /**
   * Base height value for health estimate calculations.
   * Used in offset calculations: `height - 2`.
   */
  height: number;

  /**
   * Whether estimates should always be shown (not just on hover).
   */
  alwaysShow: boolean;

  /**
   * Whether estimates should only be shown during combat.
   */
  combatOnly: boolean;

  /**
   * Whether combat is currently running.
   */
  combatRunning: boolean;

  /**
   * Last zoom level tracked for zoom-based updates.
   */
  lastZoom: number | null;

  /**
   * Whether to output estimates to chat.
   */
  outputChat: boolean;

  /**
   * Cache of actor current HP values.
   * Key: actor/token ID, Value: current HP number
   */
  actorsCurrentHP: Record<string, number>;

  /**
   * The module's Estimation Provider instance.
   * Also accessible via the `provider` getter.
   */
  estimationProvider: any; // EstimationProvider type would require provider definitions

  /**
   * Array of estimation configurations.
   */
  estimations: HealthEstimateEstimation[];

  /**
   * Array of state description names.
   */
  descriptions: string[];

  /**
   * Name to display for dead state.
   */
  deathStateName: string;

  /**
   * Whether to show dead state.
   */
  showDead: boolean;

  /**
   * Whether NPCs just die at 0 HP.
   */
  NPCsJustDie: boolean;

  /**
   * Path/URL to the death marker icon.
   */
  deathMarker: string;

  /**
   * Whether to use smooth color gradient.
   */
  smoothGradient: boolean;

  /**
   * Font family for estimate text.
   */
  fontFamily: string;

  /**
   * Base font size for estimate text.
   */
  fontSize: number;

  /**
   * Array of colors for different health stages.
   */
  colors: string[];

  /**
   * Array of outline/stroke colors for different health stages.
   */
  outline: string[];

  /**
   * Color for dead state.
   */
  deadColor: string;

  /**
   * Outline color for dead state.
   */
  deadOutline: string;

  /**
   * Tooltip position setting, or null if elevation-module is active.
   */
  tooltipPosition: string | null;

  /**
   * Break conditions for controlling estimate display.
   */
  breakConditions: HealthEstimateBreakConditions;

  /**
   * Function to check if overlay rendering should be broken/stopped.
   * @param token - The token to check
   * @returns true if rendering should be stopped, false otherwise
   */
  breakOverlayRender: (token: foundry.canvas.placeables.Token) => boolean;

  /**
   * Function to get the token effects path for death marker checking.
   * @param token - The token to check
   * @returns true if token has death marker effect, false otherwise
   */
  tokenEffectsPath?: (token: foundry.canvas.placeables.Token) => boolean;

  // Getters (computed properties)

  /**
   * Grid scale factor. Returns `canvas.scene.dimensions.size / 100` if scaleToGridSize is true, otherwise 1.
   * @readonly
   */
  readonly gridScale: number;

  /**
   * The module's Estimate Provider (alias for estimationProvider).
   * @readonly
   */
  readonly provider: any; // EstimationProvider type

  /**
   * Font size scaled to current grid scale and zoom level.
   * Multiplies by 4 to increase resolution.
   * @readonly
   */
  readonly scaledFontSize: number;

  /**
   * Current zoom level. Returns 1 if scaleToZoom is disabled.
   * @readonly
   */
  readonly zoomLevel: number;

  // Methods

  /**
   * Sets up the module's estimation provider, registers settings and updates break conditions.
   */
  setup(): void;

  /**
   * Returns an array of estimates related to the token.
   * @param token - The token document to get estimates for
   * @returns Object containing the matched estimation and optional special estimation
   */
  getTokenEstimate(
    token: foundry.documents.BaseToken,
  ): HealthEstimateTokenEstimateResult;

  /**
   * Returns the token's estimate description, color and stroke outline.
   * @param token - The token to get estimation for
   * @returns Object containing description text, fill color, and stroke color
   */
  getEstimation(
    token: foundry.canvas.placeables.Token | foundry.documents.BaseToken,
  ): HealthEstimateEstimationResult;

  /**
   * Returns the current health fraction of the token (0-1).
   * @param token - The token document to get fraction for
   * @returns Health fraction as a number between 0 and 1
   */
  getFraction(token: foundry.documents.BaseToken): number;

  /**
   * Returns the estimate and its index based on the health fraction.
   * @param token - The token document to get stage for
   * @param fraction - The health fraction (0-1)
   * @returns Object containing the matched estimate and its index
   */
  getStage(
    token: foundry.documents.BaseToken,
    fraction: number,
  ): HealthEstimateStageResult;

  /**
   * Checks if a Token's or TokenDocument's estimate should be hidden.
   * @param token - The token or token document to check
   * @returns true if estimate should be hidden, false otherwise
   */
  hideEstimate(
    token: foundry.canvas.placeables.Token | foundry.documents.BaseToken,
  ): boolean;

  /**
   * Checks if any combat, linked to the current scene or unlinked, is active.
   * @returns true if combat is running, false otherwise
   */
  isCombatRunning(): boolean;

  /**
   * Returns if a token is dead.
   * A token is dead if:
   * (a) is a NPC at 0 HP and the NPCsJustDie setting is enabled
   * (b) has been set as dead in combat and the showDead setting is enabled
   * (c) has the healthEstimate.dead flag
   * @param token - The token to check
   * @param stage - The health stage value
   * @returns true if token is considered dead, false otherwise
   */
  isDead(token: foundry.canvas.placeables.Token, stage: number): boolean;

  /**
   * Checks if the estimate should be displayed based on the current conditions.
   * @param hovered - Whether the token is currently hovered
   * @returns true if estimate should be shown, false otherwise
   */
  showCondition(hovered: boolean): boolean;

  /**
   * Updates the Break Conditions and the Overlay Render's Break Condition method.
   */
  updateBreakConditions(): void;

  /**
   * Updates the module's cached setting values.
   * Called when settings change to avoid multiple system calls.
   */
  updateSettings(): void;
}

/**
 * Token-level health estimate data.
 * Accessed via `token.healthEstimate`.
 * This is a PIXI.Text object with health estimate display properties.
 *
 * The most commonly accessed properties are documented below, but this is
 * a full PIXI.Text instance with all its standard properties available.
 */
type HealthEstimateTokenData = PIXI.Text;

/**
 * Token type with Health Estimate augmentation.
 * Use this type when you need to access token.healthEstimate properties.
 */
export type TokenWithHealthEstimate = foundry.canvas.placeables.Token & {
  healthEstimate?: HealthEstimateTokenData;
};

// Global augmentation for game.healthEstimate
declare global {
  interface Game {
    /**
     * Health Estimate module configuration and state.
     * Only present when the Health Estimate module is active.
     */
    healthEstimate?: HealthEstimateGameConfig;
  }

  // Augment ReadyGame if it's a separate type
  // This ensures the property is available on the actual game variable type
  interface ReadyGame extends Game {
    healthEstimate?: HealthEstimateGameConfig;
  }
}

// Namespace augmentation for token.healthEstimate
// Using nested namespace declaration for proper type merging
declare namespace foundry {
  namespace canvas {
    namespace placeables {
      interface Token {
        /**
         * Health Estimate module data for this token.
         * Only present when the Health Estimate module is active and has data for this token.
         * This is a PIXI.Text object with health estimate display properties.
         */
        healthEstimate?: HealthEstimateTokenData;
      }
    }
  }
}

export {};
