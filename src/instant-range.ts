import { InstantRangeRenderer } from "./range-renderer.ts";
import { instantRangeState, MODULE_ID } from "./module-const.ts";

let instantRangeInstance: InstantRangeRenderer | null = null;

interface ConflictInfo {
  id: string;
  type: string;
  reason?: string;
  [key: string]: unknown;
}

const errorState: {
  conflictingPackage: ConflictInfo | null;
  wrapperError: Error | null;
} = {
  conflictingPackage: null,
  wrapperError: null,
};

Hooks.once("init", onceInit);
Hooks.once("setup", onceSetup);
Hooks.once("ready", onceReady);

/**
 * Register the module's settings.
 * @see https://foundryvtt.com/api/functions/hookEvents.init.html
 * @see https://foundryvtt.com/api/classes/foundry.helpers.ClientSettings.html#register
 */
function onceInit(): void {
  game.settings.register(MODULE_ID, "hoverOnlyInCombat", {
    name: "instant-range.settings.hoverOnlyInCombat.name",
    hint: "instant-range.settings.hoverOnlyInCombat.hint",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value: boolean) => {
      instantRangeState.settings.hoverOnlyInCombat = value;
      instantRangeInstance?.onGatePossiblyChanged();
    },
    scope: "world",
  });

  game.settings.register(MODULE_ID, "refreshThrottleMs", {
    name: "instant-range.settings.refreshThrottleMs.name",
    hint: "instant-range.settings.refreshThrottleMs.hint",
    config: true,
    type: Number,
    range: {
      min: 0,
      max: 500,
      step: 20,
    },
    default: 40,
    onChange: (value: number) => {
      instantRangeState.settings.refreshThrottleMs = value;
      instantRangeInstance?.setRefreshThrottleMs(value);
    },
    scope: "client",
  });
}

/**
 * Check for conflicting modules declared in module.json relationships.
 * If a conflict is detected, record it and skip further setup.
 * Otherwise, register canvas lifecycle hooks and settings snapshot for hot paths.
 * @see https://github.com/ruipin/fvtt-lib-wrapper/
 */
function onceSetup() {
  const mod = game.modules.get(MODULE_ID)!;

  const conflicts = mod.relationships.conflicts;
  for (const conflict of conflicts) {
    if (game.modules.get(conflict.id)?.active) {
      errorState.conflictingPackage = conflict;
      console.warn(
        `${MODULE_ID}: Detected conflicting module '${conflict.id}' is active. Reason: ${conflict.reason}`,
      );
      return; // Skip the rest of setup
    }
  }

  // Register libWrapper for the module to hide the tooltip when the token is hovered.
  try {
    libWrapper.register(
      MODULE_ID,
      "foundry.canvas.placeables.Token.prototype._getTooltipText",
      function (
        this: foundry.canvas.placeables.Token,
        wrapped: (...args: unknown[]) => string,
        ...args: unknown[]
      ): string {
        // Get the original tooltip text. (because this is a WRAPPER)
        const originalText = wrapped.apply(this, args);
        let tooltipText = originalText;

        if (instantRangeInstance?.shouldHideTooltipForToken(this.id)) {
          tooltipText = "";
        }

        return tooltipText;
      },
      "WRAPPER",
    );
  } catch (err: unknown) {
    console.error(err);
    errorState.wrapperError =
      err instanceof Error ? err : new Error(String(err));
    return;
  }

  Hooks.on("canvasReady", onCanvasReady);
  Hooks.on("canvasTearDown", onCanvasTearDown);

  if (game.settings) {
    instantRangeState.settings.hoverOnlyInCombat = game.settings.get(
      MODULE_ID,
      "hoverOnlyInCombat",
    );
    instantRangeState.settings.refreshThrottleMs = game.settings.get(
      MODULE_ID,
      "refreshThrottleMs",
    );
  }
}

/**
 * Notify the user of any errors that occurred during setup.
 * @see https://foundryvtt.com/api/classes/foundry.applications.ui.Notifications.html
 */
function onceReady(): void {
  if (!ui.notifications) return;
  if (errorState.conflictingPackage) {
    ui.notifications.warn("instant-range.warnings.conflictDetected", {
      format: errorState.conflictingPackage as Record<string, string>,
      permanent: true,
    });
    return;
  } else if (errorState.wrapperError) {
    ui.notifications.error("instant-range.warnings.failedToRegisterWrappers", {
      format: {
        package_id: MODULE_ID,
        error_name: errorState.wrapperError.name,
      },
      permanent: true,
    });
  }
}

/**
 * Create new InstantRangeRenderer instance
 * @see https://foundryvtt.com/api/functions/hookEvents.canvasReady.html
 */
function onCanvasReady() {
  // Create new instance - constructor guarantees canvas is ready
  instantRangeInstance = new InstantRangeRenderer();
}

/**
 * Clean up the scene hooks, and nullify the instance for GC.
 * @see https://foundryvtt.com/api/functions/hookEvents.canvasTearDown.html
 */
function onCanvasTearDown() {
  instantRangeInstance?.cleanup();
  instantRangeInstance = null;
}
