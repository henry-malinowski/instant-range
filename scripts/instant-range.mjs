import {
	getCurrentHoveredTokenId,
	onControlToken,
	onHoverToken,
	onRefreshToken,
	onDeleteToken,
	onUpdateCombat,
	onDeleteCombat,
	registerCanvasGroup
} from "./range-renderer.mjs";

const MODULE_ID = "instant-range";

const errorState = {
	conflictingPackage: null,
	wrapperError: null
};

Hooks.once("init", onceInit);
Hooks.once("libWrapper.Ready", onceLibWrapperReady);
Hooks.once("setup", onceSetup);
Hooks.once("ready", onceReady);

const SETTINGS = [
	{
		id: "allowHoverOutOfCombat",
		name: "instant-range.settings.allowHoverOutOfCombat.name",
		hint: "instant-range.settings.allowHoverOutOfCombat.hint",
		config: true,
		type: Boolean,
		default: false,
		onChange: (value) => game.modules.get(MODULE_ID).instance.settings.allowHoverOutOfCombat = value,
		scope: "world",
		restricted: true
	},
	{
		id: "realtimeUpdate",
		name: "instant-range.settings.realtimeUpdate.name",
		hint: "instant-range.settings.realtimeUpdate.hint",
		config: true,
		type: Boolean,
		default: true,
		onChange: (value) => {
			game.modules.get(MODULE_ID).instance.settings.realtimeUpdate = value;
			onRealtimeUpdateChange(value);
		},
		scope: "client",
	}
];

const COMMON_HOOKS = [
	{ name: "hoverToken", callback: onHoverToken },
	{ name: "controlToken", callback: onControlToken },
	{ name: "deleteToken", callback: onDeleteToken },
	{ name: "updateCombat", callback: onUpdateCombat },
	{ name: "deleteCombat", callback: onDeleteCombat }
];

/**
 * Initialize the module's settings.
 */
function onceInit() {
	registerCanvasGroup();
	for (const setting of SETTINGS) {
		game.settings.register(MODULE_ID, setting.id, {
			...setting
		});
	}
}

/**
 * Check for conflicting modules declared in module.json relationships.
 * If a conflict is detected, record it and skip further setup.
 */
function onceSetup() {
	const mod = game.modules.get(MODULE_ID);

	// Check for conflicting modules declared in module.json relationships.
	const conflicts = mod.relationships.conflicts ?? [];
	for (const conflict of conflicts) {
		if (game.modules.get(conflict.id)?.active) {
			errorState.conflictingPackage = conflict;
			console.warn(
				`${MODULE_ID}: Detected conflicting module '${conflict.id}' is active. Reason: ${conflict.reason}`
			);
			return; // Skip the rest of setup
		}
	}

	// Settings snapshot for hot paths
	mod.instance = {
		settings: {
			allowHoverOutOfCombat: game.settings.get(MODULE_ID, "allowHoverOutOfCombat"),
			realtimeUpdate: game.settings.get(MODULE_ID, "realtimeUpdate")
		}
	};
}

/**
 * Register the libWrapper for the module to hide the tooltip when the token is hovered.
 */
function onceLibWrapperReady() {
	try {
		// Hook to hide the Elevation tooltip when the token is hovered.
		libWrapper.register(
			MODULE_ID,
			"foundry.canvas.placeables.Token.prototype._getTooltipText",
			function (wrapped, ...args) {
				// Get the original tooltip text. (because this is a WRAPPER)
				const originalText = wrapped.apply(this, args);
				// Get the current hovered token ID, and return an empty string if the token is hovered.
				const hoveredId = getCurrentHoveredTokenId();
				if (hoveredId && this?.id === hoveredId) return "";
				// else, return the original tooltip text.
				return originalText;
			},
			"WRAPPER"
		);
	} catch (err) {
		console.error(err);
		errorState.wrapperError = err;
	}
}

/**
 * Register the common hooks for the module.
 */
function onceReady() {
	// If a conflicting package is active, warn and skip registering hooks.
	if (errorState.conflictingPackage) {
		ui.notifications.warn("instant-range.warnings.conflictDetected", {
			format: errorState.conflictingPackage,
			permanent: true
		});
		return;
	} else if (errorState.wrapperError) {
		ui.notifications.error(`${MODULE_ID} could not wrap Token.prototype._getTooltipText`, {permanent: true});
	}

	for (const hook of COMMON_HOOKS) Hooks.on(hook.name, hook.callback);

	/**
	 * Register or clear the realtime update hook based on the current setting.
	 */
	const realtime = game.settings.get(MODULE_ID, "realtimeUpdate");
	onRealtimeUpdateChange(realtime);
}

/**
 * Register or clear the hook for the realtime update of the range when the token is refreshed.
 * @param {value} boolean value 
 * @returns {void}
 */
function onRealtimeUpdateChange(value) {
	Hooks.off("refreshToken", onRefreshToken);
	if (value) Hooks.on("refreshToken", onRefreshToken);
}