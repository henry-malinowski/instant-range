import { calculateHealthEstimateOffset } from "./lib/health-estimate.ts";
import { LABEL_TRIGGER, LabelRegistry } from "./lib/label-registry.ts";
import { MeasurementCache } from "./lib/measurement-cache.ts";
import {
  didTokenMove,
  getBaseSourceToken,
  getSourceToken,
  isTokenVisible,
} from "./lib/token-utils.ts";
import { instantRangeState } from "./module-const.ts";

/**
 * InstantRangeRenderer - Manages all instant-range functionality in a single class
 * Eliminates defensive canvas checks by using constructor-based lifecycle management
 */
export class InstantRangeRenderer {
  containers: {
    root: PIXI.Container;
  };
  labelRegistry!: LabelRegistry;
  state: {
    sourceToken: foundry.canvas.placeables.Token | null;
    hoveredTarget: foundry.canvas.placeables.Token | null;
    isShowingAll: boolean;
  };
  measurementCache: MeasurementCache;
  refreshAllActiveLabelsThrottled: () => void;
  private _onCanvasPanBound: () => void;
  private _hookIds!: {
    canvasPan: number;
    controlToken: number;
    createCombat: number;
    deleteCombat: number;
    deleteToken: number;
    destroyToken: number;
    highlightObjects: number;
    hoverToken: number;
    refreshTokenSource: number;
    refreshTokenTarget: number;
    targetToken: number;
    updateCombat: number;
  };

  constructor() {
    // Container Management
    this.containers = { root: new PIXI.Container() };

    // State Management
    this.state = {
      sourceToken: null,
      hoveredTarget: null,
      isShowingAll: false,
    };

    // Measurement Cache - per instance for clean scene changes
    this.measurementCache = new MeasurementCache();

    // Stable hook callback so we can swap throttling at runtime without re-registering hooks.
    this._onCanvasPanBound = this.onCanvasPan.bind(this);
    // Throttled refresh for performance-sensitive calls (pan, source dragging)
    this.refreshAllActiveLabelsThrottled =
      this.refreshAllActiveLabels.bind(this);
    this.setRefreshThrottleMs(instantRangeState.settings.refreshThrottleMs);

    // Initialize containers immediately since canvas is guaranteed ready
    this.initializeContainers();
    this.initializeLabelRegistry();
    this.bindHooks();
  }

  /**
   * Update the refresh-all throttle interval.
   * A value of 0 disables throttling (refresh will still occur on a setTimeout(0) tick if called via throttle).
   */
  setRefreshThrottleMs(ms: number): void {
    if (ms > 0) {
      // @see https://foundryvtt.com/api/functions/foundry.utils.throttle.html
      this.refreshAllActiveLabelsThrottled = foundry.utils.throttle(
        this.refreshAllActiveLabels.bind(this),
        ms,
      );
    } else {
      this.refreshAllActiveLabelsThrottled =
        this.refreshAllActiveLabels.bind(this);
    }
  }

  private onCanvasPan(): void {
    this.refreshAllActiveLabelsThrottled();
  }

  /**
   * Should the Elevation tooltip be hidden for a given token id?
   * Tooltip should be hidden if a distance label is actually visible for that token.
   * @param {string} tokenId
   * @returns {boolean}
   */
  shouldHideTooltipForToken(tokenId: string): boolean {
    const sourceTokenId = this.state.sourceToken?.id;
    if (sourceTokenId && tokenId === sourceTokenId) return false;
    return !!this.labelRegistry.isLabelVisible(tokenId);
  }

  /**
   * Initialize PIXI containers for rendering labels.
   * @see https://foundryvtt.com/api/classes/foundry.canvas.layers.InterfaceLayer.html
   * @see https://pixijs.download/release/docs/PIXI.Container.html
   */
  initializeContainers(): void {
    const root = this.containers.root;
    root.sortableChildren = true;
    root.zIndex = CONFIG.Canvas.groups.interface.zIndexScrollingText ?? 0;
    canvas.interface!.addChild(root);
  }

  initializeLabelRegistry(): void {
    this.labelRegistry = new LabelRegistry({
      root: this.containers.root,
      measurementCache: this.measurementCache,
      getSourceToken: () => getSourceToken(),
      isEnabled: this.isEnabled.bind(this),
      isTokenVisible,
      offsetCallback: calculateHealthEstimateOffset,
    });
  }

  /**
   * Register all hooks as bound instance methods
   */
  bindHooks() {
    // Store hook IDs returned by Hooks.on() for proper cleanup
    this._hookIds = {
      canvasPan: Hooks.on("canvasPan", this._onCanvasPanBound),
      controlToken: Hooks.on("controlToken", this.onControlToken.bind(this)),
      createCombat: Hooks.on("createCombat", this.onCreateCombat.bind(this)),
      deleteCombat: Hooks.on("deleteCombat", this.onDeleteCombat.bind(this)),
      deleteToken: Hooks.on("deleteToken", this.onDeleteToken.bind(this)),
      destroyToken: Hooks.on("destroyToken", this.onDestroyToken.bind(this)),
      highlightObjects: Hooks.on(
        "highlightObjects",
        this.onHighlightObjects.bind(this),
      ),
      hoverToken: Hooks.on("hoverToken", this.onHoverToken.bind(this)),
      // Register source handler first to preserve prior execution order.
      refreshTokenSource: Hooks.on(
        "refreshToken",
        this.onRefreshSourceToken.bind(this),
      ),
      refreshTokenTarget: Hooks.on(
        "refreshToken",
        this.onRefreshTargetToken.bind(this),
      ),
      targetToken: Hooks.on("targetToken", this.onTargetToken.bind(this)),
      updateCombat: Hooks.on("updateCombat", this.onUpdateCombat.bind(this)),
    };
  }

  /**
   * Clean up all hooks
   */
  cleanup(): void {
    Hooks.off("canvasPan", this._hookIds.canvasPan);
    Hooks.off("controlToken", this._hookIds.controlToken);
    Hooks.off("createCombat", this._hookIds.createCombat);
    Hooks.off("deleteCombat", this._hookIds.deleteCombat);
    Hooks.off("deleteToken", this._hookIds.deleteToken);
    Hooks.off("destroyToken", this._hookIds.destroyToken);
    Hooks.off("highlightObjects", this._hookIds.highlightObjects);
    Hooks.off("hoverToken", this._hookIds.hoverToken);
    Hooks.off("refreshToken", this._hookIds.refreshTokenSource);
    Hooks.off("refreshToken", this._hookIds.refreshTokenTarget);
    Hooks.off("targetToken", this._hookIds.targetToken);
    Hooks.off("updateCombat", this._hookIds.updateCombat);
  }

  /**
   * A hook event that fires when a token {@link foundry.canvas.placeables.Token} is hovered over or out.
   * @param {Token} token The Token instance.
   * @param {boolean} hovered Whether the Token is hovered over or out.
   * @returns void
   * @see https://foundryvtt.com/api/functions/hookEvents.hoverObject.html
   */
  onHoverToken(token: foundry.canvas.placeables.Token, hovered: boolean): void {
    if (token.isPreview) return;

    if (!hovered) {
      this.clearHoverState(token);
      return;
    }

    this.state.hoveredTarget = token;
    this.state.sourceToken = getBaseSourceToken();
    this.labelRegistry.setTrigger(token, LABEL_TRIGGER.HOVER, true);
  }

  /**
   * Hook event for highlightObjects (Alt-key) state changes
   * @param {boolean} active Is the highlight state now active
   * @see https://foundryvtt.com/api/functions/hookEvents.highlightObjects.html
   */
  onHighlightObjects(active: boolean): void {
    this.state.isShowingAll = active;
    this.applyAltHighlight(active);
  }

  /**
   * A hook event that fires when a token {@link foundry.canvas.placeables.Token} is refreshed.
   * @param {Token} token - The token that is being refreshed.
   * @param {Record<string, boolean>} flags - Render flags indicating what was refreshed.
   * @description Includes properties like `refreshPosition`, `refreshElevation`, `refreshSize`, etc.
   *   Note: The official documentation doesn't mention this parameter, but Foundry's source code
   *   (`placeable-object.mjs:368`) confirms it is passed as the second argument.
   * @returns void
   * @see https://foundryvtt.com/api/functions/hookEvents.refreshObject.html
   */
  onRefreshSourceToken(
    token: foundry.canvas.placeables.Token,
    flags: Record<string, boolean> = {},
  ): void {
    if (!didTokenMove(flags)) return;

    // In Foundry v13, PlaceableObject.id is always derived from document.id (including previews).
    const baseSource = getBaseSourceToken();
    if (!baseSource) return;

    const tokenBaseId = token.sourceId.replace(/\.preview$/, "");
    const sourceBaseId = baseSource.sourceId;

    if (tokenBaseId !== sourceBaseId) return;

    if (!token.isPreview) {
      this.state.sourceToken = baseSource;
    }
    this.refreshAllActiveLabelsThrottled();
  }

  onRefreshTargetToken(
    token: foundry.canvas.placeables.Token,
    flags: Record<string, boolean> = {},
  ): void {
    if (!didTokenMove(flags)) return;
    if (token.isPreview) return;
    if (!token.id) return;

    const triggers = this.labelRegistry.getTriggers(token.id);
    if (!triggers) return;

    this.labelRegistry.refreshLabel(token);
  }

  /**
   * Hook: clears range UI when control over a token is lost.
   * @param {foundry.canvas.placeables.Token} token The Token instance which is selected/deselected.
   * @param {boolean} controlled Whether the Placeable Token is selected or not.
   * @see https://foundryvtt.com/api/functions/hookEvents.controlObject.html
   */
  onControlToken(
    token: foundry.canvas.placeables.Token,
    controlled: boolean,
  ): void {
    if (!controlled) {
      this.state.sourceToken = null;
      this.onGatePossiblyChanged();
      return;
    }

    this.state.sourceToken = getBaseSourceToken();
    this.onGatePossiblyChanged();
  }

  /**
   * Hook: clear range UI when a token is deleted, but only if relevant to current hover/control pair.
   * The hook name "deleteToken" is generated from the generic "deleteDocument" hook via document name substitution.
   * @param {TokenDocument} tokenDocument The existing [Token] Document which was deleted
   * @see https://foundryvtt.com/api/functions/hookEvents.deleteDocument.html
   */
  onDeleteToken(tokenDocument: foundry.documents.TokenDocument): void {
    const deletedId = tokenDocument.id;
    if (!deletedId) return;

    // Invalidate cache entries for this token (both regular and preview sourceId formats)
    const tokenSourceId = `Token.${deletedId}`;
    this.measurementCache.invalidateToken(tokenSourceId);
    // Also invalidate preview entries if they exist (though previews are destroyed on drag end)
    this.measurementCache.invalidateToken(`${tokenSourceId}.preview`);

    this.labelRegistry.deleteLabel(deletedId);

    const controlled = getSourceToken();
    if (
      this.state.hoveredTarget?.id === deletedId ||
      (controlled && controlled.id === deletedId)
    ) {
      this.state.hoveredTarget = null;
    }
  }

  /**
   * Invalidate cache when a token placeable object is destroyed.
   * @param {foundry.canvas.placeables.Token} token The Token instance which is being destroyed
   * @description When a token is deleted from canvas, both deleteToken (primary) and destroyToken fire.
   * destroyToken also fires after canvasTearDown on scene changes, but the renderer instance
   * is already cleaned up at that point, so this is a no-op.
   * @see https://foundryvtt.com/api/functions/hookEvents.destroyObject.html
   */
  onDestroyToken(token: Token): void {
    if (token.isPreview) {
      this.measurementCache.invalidateToken(token.sourceId);
    }
  }

  /**
   * Clear UI on combat updates only if we currently have a hover target.
   * @param {Combat} document - The Combat document that was updated
   * @param {object} changed - Differential data that was used to update the document
   * @param {Partial<DatabaseUpdateOperation>} options - Additional options which modified the update request
   * @param {string} userId - The ID of the User who triggered the update workflow
   * @see https://foundryvtt.com/api/functions/hookEvents.updateDocument.html
   */
  onUpdateCombat(
    document: foundry.documents.Combat,
    changed: object,
    options: object,
    userId: string,
  ): void {
    this.onGatePossiblyChanged();
  }

  /**
   * Clear UI when combat is deleted only if we currently have a hover target.
   * @param {foundry.documents.Combat} document The Combat document that was deleted
   * @param {object} options Additional options which modified the deletion request
   * @param {string} userId The ID of the User who triggered the deletion workflow
   * @description The hook name "deleteCombat" is generated from the generic "deleteDocument" hook via document name substitution.
   * @see https://foundryvtt.com/api/functions/hookEvents.deleteDocument.html
   */
  onDeleteCombat(
    document: foundry.documents.Combat,
    options: object,
    userId: string,
  ): void {
    this.onGatePossiblyChanged();
  }

  /**
   * Combat created can flip the isEnabled gate.
   * @param {foundry.documents.Combat} document The Combat document that was created
   * @param {object} options Additional options which modified the creation request
   * @param {string} userId The ID of the User who triggered the creation workflow
   * @description The hook name "createCombat" is generated from the generic "createDocument" hook via document name substitution.
   * @see https://foundryvtt.com/api/functions/hookEvents.createDocument.html
   */
  onCreateCombat(
    document: foundry.documents.Combat,
    options: object,
    userId: string,
  ): void {
    this.onGatePossiblyChanged();
  }

  /**
   * Feature gate: only allow rendering when either `hoverOnlyInCombat` is false or there is an active combat.
   * @see https://foundryvtt.com/api/classes/foundry.Game.html#combats
   */
  isEnabled(): boolean {
    if (game.combats.active) return true;
    return !instantRangeState.settings.hoverOnlyInCombat;
  }

  /**
   * Apply or remove highlight-objects trigger on token labels.
   * @param {boolean} active Whether the highlight state is now active
   * @see https://foundryvtt.com/api/classes/foundry.canvas.layers.TokenLayer.html#placeables
   */
  applyAltHighlight(active: boolean): void {
    this.state.sourceToken = getBaseSourceToken();

    const source = this.state.sourceToken;
    const tokens = canvas.tokens!.placeables;

    if (active) {
      // Assert HIGHLIGHT_OBJECTS for all tokens except the current source.
      for (const token of tokens) {
        if (token.isPreview) continue;
        if (source && token.id === source.id) continue;
        this.labelRegistry.setTrigger(
          token,
          LABEL_TRIGGER.HIGHLIGHT_OBJECTS,
          true,
          {
            refresh: false,
          },
        );
      }
      this.labelRegistry.refreshAllActiveLabels(tokens);
    } else {
      // Deassert only HIGHLIGHT_OBJECTS; keep hover/target triggers intact.
      this.labelRegistry.clearTriggerFromAllLabels(
        LABEL_TRIGGER.HIGHLIGHT_OBJECTS,
        tokens,
      );
    }
  }

  /**
   * Refresh all active labels (pan, source movement, gate changes).
   * @see https://foundryvtt.com/api/functions/hookEvents.canvasPan.html
   */
  refreshAllActiveLabels() {
    const newBaseSource = getBaseSourceToken();
    const sourceChanged =
      !this.state.sourceToken ||
      !newBaseSource ||
      this.state.sourceToken.id !== newBaseSource.id;

    if (sourceChanged) {
      this.state.sourceToken = newBaseSource;
    }

    if (this.state.isShowingAll) {
      // Ensure HIGHLIGHT_OBJECTS triggers cover all non-source tokens even if source changes mid-hold.
      this.applyAltHighlight(true);
      return;
    }
    this.labelRegistry.refreshAllActiveLabels(canvas.tokens!.placeables);
  }

  /**
   * Called when the feature-gate might have changed (combat start/end, settings, source control).
   * This hides/shows labels without clearing their triggers.
   */
  onGatePossiblyChanged(): void {
    this.refreshAllActiveLabels();
  }

  private clearHoverState(
    token?: foundry.canvas.placeables.Token | null,
  ): void {
    const target = token ?? this.state.hoveredTarget;
    this.state.hoveredTarget = null;
    if (target) {
      this.labelRegistry.setTrigger(target, LABEL_TRIGGER.HOVER, false);
    }
  }

  /**
   * Toggles the target token with a distance label, only responds to the local user's target set.
   * @param {User} user The User doing the targeting
   * @param {foundry.canvas.placeables.Token} token The targeted Token
   * @param {boolean} targeted Whether the Token has been targeted or untargeted
   * @see https://foundryvtt.com/api/functions/hookEvents.targetToken.html
   */
  onTargetToken(
    user: foundry.documents.BaseUser,
    token: foundry.canvas.placeables.Token,
    targeted: boolean,
  ): void {
    // Only respond to the local user's target set.
    if (user.id !== game.user.id) return;
    if (token.isPreview) return;
    this.labelRegistry.setTrigger(token, LABEL_TRIGGER.TARGET, !!targeted);
  }
}
