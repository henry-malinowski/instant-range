import {
  createLabelContainer,
  hideLabel,
  updateLabel,
  type LabelContainer,
} from "./label.ts";
import { type MeasurementCache } from "./measurement-cache.ts";

export const LABEL_TRIGGER = {
  HOVER: 1 << 0,
  HIGHLIGHT_OBJECTS: 1 << 1,
  TARGET: 1 << 2,
} as const;

/**
 * Label record containing container and trigger bitmask.
 */
interface LabelRecord {
  container: LabelContainer;
  triggers: number;
}

/**
 * Dependencies for LabelRegistry constructor.
 */
interface LabelRegistryDeps {
  root: PIXI.Container;
  measurementCache: MeasurementCache;
  getSourceToken: () => foundry.canvas.placeables.Token | null;
  isEnabled: () => boolean;
  isTokenVisible: (token: foundry.canvas.placeables.Token) => boolean;
  offsetCallback?: (token: foundry.canvas.placeables.Token) => number;
}

/**
 * LabelRegistry
 * Owns label containers per target token, and tracks independent "triggers" that activate a label.
 *
 * Visibility rule:
 * - a label is visible iff it has at least one trigger AND
 *   - gate allows rendering AND
 *   - a valid source token exists AND
 *   - target != source AND
 *   - token is within viewport (isTokenVisible)
 *
 * Triggers persist even when the gate disables; re-enabling refreshes labels without needing new events.
 */
export class LabelRegistry {
  root: PIXI.Container;
  measurementCache: MeasurementCache;
  getSourceToken: () => Token | null;
  isEnabled: () => boolean;
  isTokenVisible: (token: Token) => boolean;
  offsetCallback: (token: Token) => number;
  private _labelMap: Map<string, LabelRecord>;

  /**
   * @param {object} deps
   * @param {PIXI.Container} deps.root
   * @param {MeasurementCache} deps.measurementCache
   * @param {() => Token|null} deps.getSourceToken
   * @param {() => boolean} deps.isEnabled
   * @param {(token: Token) => boolean} deps.isTokenVisible
   * @param {(token: Token) => number} [deps.offsetCallback]
   */
  constructor({
    root,
    measurementCache,
    getSourceToken,
    isEnabled,
    isTokenVisible,
    offsetCallback,
  }: LabelRegistryDeps) {
    this.root = root;
    this.measurementCache = measurementCache;
    this.getSourceToken = getSourceToken;
    this.isEnabled = isEnabled;
    this.isTokenVisible = isTokenVisible;
    this.offsetCallback = offsetCallback ?? (() => 0);
    this._labelMap = new Map();
  }

  /**
   * Get the label record for a token, if it exists.
   * @param {string} tokenId - The ID of the token
   * @returns {{container: PIXI.Container, triggers: number} | null} The label record, or null if not found
   */
  getLabelRecord(tokenId: string): LabelRecord | null {
    return this._labelMap.get(tokenId) ?? null;
  }

  /**
   * Check if a label is currently visible for a token.
   * @param {string} tokenId - The ID of the token
   * @returns {boolean} True if the label exists and is visible
   */
  isLabelVisible(tokenId: string): boolean {
    const labelRecord = this._labelMap.get(tokenId);
    return !!labelRecord?.container?.visible;
  }

  /**
   * Get the bitmask of active triggers for a token's label.
   * @param {string} tokenId - The ID of the token
   * @returns {number} Bitmask of active triggers (0 if no label exists)
   */
  getTriggers(tokenId: string): number {
    return this._labelMap.get(tokenId)?.triggers || 0;
  }

  /**
   * Check if a specific trigger is active for a token's label.
   * @param {string} tokenId - The ID of the token
   * @param {number} trigger - The trigger flag to check (from LABEL_TRIGGER)
   * @returns {boolean} True if the trigger is active
   */
  hasTrigger(tokenId: string, trigger: number): boolean {
    return (this.getTriggers(tokenId) & trigger) !== 0;
  }

  /**
   * Creates a new PIXI container and adds it to the root if the token doesn't have a label yet.
   * @param {foundry.canvas.placeables.Token} token The token to get or create a label for
   * @returns {{container: PIXI.Container, triggers: number}} The label record
   */
  getOrCreateLabelRecord(token: foundry.canvas.placeables.Token): LabelRecord {
    let labelRecord = this._labelMap.get(token.id);
    if (labelRecord) return labelRecord;

    const container = createLabelContainer();
    container.visible = false;
    this.root.addChild(container);

    labelRecord = { container, triggers: 0 };
    this._labelMap.set(token.id, labelRecord);
    return labelRecord;
  }

  /**
   * Set or clear a trigger flag for a token's label.
   * Triggers are tracked as bit flags, allowing multiple triggers to be active simultaneously.
   * @param {foundry.canvas.placeables.Token} token The token whose label trigger should be updated
   * @param {number} trigger The trigger flag to set/clear (from LABEL_TRIGGER)
   * @param {boolean} active True to set the trigger, false to clear it
   * @param {{refresh?: boolean}} [options] Whether to immediately refresh the label after updating (default: true)
   */
  setTrigger(
    token: foundry.canvas.placeables.Token,
    trigger: number,
    active: boolean,
    options: { refresh?: boolean } = {},
  ): void {
    if (token.isPreview) return;

    const labelRecord = this.getOrCreateLabelRecord(token);
    const previousTriggers = labelRecord.triggers;
    labelRecord.triggers = active
      ? previousTriggers | trigger
      : previousTriggers & ~trigger;

    const shouldRefresh = options.refresh ?? true;
    if (shouldRefresh) this.refreshLabel(token);
  }

  /**
   * Clear a specific trigger flag from all labels that have it.
   * @param {number} trigger The trigger flag to clear (from LABEL_TRIGGER)
   * @param {Token[]} tokensOnCanvas Array of all tokens currently on the canvas
   */
  clearTriggerFromAllLabels(
    trigger: number,
    tokensOnCanvas: readonly foundry.canvas.placeables.Token[],
  ): void {
    for (const token of tokensOnCanvas) {
      const labelRecord = this._labelMap.get(token.id);
      if (!labelRecord) continue;
      if ((labelRecord.triggers & trigger) === 0) continue;
      labelRecord.triggers &= ~trigger;
      this.refreshLabel(token);
    }
  }

  /**
   * Refresh a single label: recompute measurement and update visibility.
   * @param {foundry.canvas.placeables.Token} token - The token whose label should be refreshed
   */
  refreshLabel(token: foundry.canvas.placeables.Token): void {
    const labelRecord = this._labelMap.get(token.id);
    if (!labelRecord) return;

    const wasLabelVisible = !!labelRecord.container.visible;

    const activeTriggers = labelRecord.triggers;
    const sourceToken = this.getSourceToken();
    if (!activeTriggers || !this.isEnabled() || !sourceToken) {
      hideLabel(labelRecord.container);
      if (wasLabelVisible) {
        this.refreshTokenTooltip(token);
      }
      return;
    }

    const sourceBaseId = sourceToken.sourceId.replace(/\.preview$/, "");
    const tokenBaseId = token.sourceId.replace(/\.preview$/, "");
    const isSameToken =
      sourceToken.id === token.id ||
      (sourceToken.isPreview &&
        !token.isPreview &&
        tokenBaseId === sourceBaseId);

    if (isSameToken || !this.isTokenVisible(token)) {
      hideLabel(labelRecord.container);
      if (wasLabelVisible) {
        this.refreshTokenTooltip(token);
      }
      return;
    }

    const measurement = this.measurementCache.getMeasurement(
      sourceToken,
      token,
    );
    updateLabel(labelRecord.container, measurement, token, this.offsetCallback);
    labelRecord.container.visible = true;

    if (!wasLabelVisible) {
      this.refreshTokenTooltip(token);
    }
  }

  /**
   * Refresh token tooltip when label visibility changes.
   * @param {foundry.canvas.placeables.Token} token - The token whose tooltip should be refreshed
   */
  private refreshTokenTooltip(token: foundry.canvas.placeables.Token): void {
    if (!token.destroyed) {
      token.renderFlags.set({ refreshTooltip: true });
      token.applyRenderFlags();
    }
  }

  /**
   * Refresh all labels that currently have at least one active trigger.
   * @param {Token[]} tokensOnCanvas - Array of all tokens currently on the canvas
   */
  refreshAllActiveLabels(
    tokensOnCanvas: readonly foundry.canvas.placeables.Token[],
  ): void {
    for (const token of tokensOnCanvas) {
      const labelRecord = this._labelMap.get(token.id);
      if (!labelRecord || !labelRecord.triggers) continue;
      this.refreshLabel(token);
    }
  }

  /**
   * Destroy and remove a label record for a token.
   * @param {string} tokenId - The ID of the token whose label should be deleted
   */
  deleteLabel(tokenId: string): void {
    const labelRecord = this._labelMap.get(tokenId);
    if (!labelRecord) return;
    labelRecord.container.destroy({ children: true });
    this._labelMap.delete(tokenId);
  }
}
