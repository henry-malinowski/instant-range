const { PreciseText } = foundry.canvas.containers;

const GROUP_KEY = "instantRangeInterface";

const BASE_TEXT_STYLE_PROPERTIES = () => ({
	...CONFIG.canvasTextStyle,
	fill: 0xFFFFFF,
	stroke: 0x000000,
	strokeThickness: 5,
	align: "center",
	padding: 10,
	lineJoin: "round"
});

const ICON_TEXT_STYLE_PROPERTIES = {
	fontFamily: "Font Awesome 6 Pro",
	fontWeight: 900,
	fontSize: 24
};

const DISTANCE_TEXT_STYLE_PROPERTIES = {
	fontWeight: "bold",
	fontSize: ICON_TEXT_STYLE_PROPERTIES.fontSize * (1.25)
};

/**
 * Register a dedicated interface group so state is owned by the group instance.
 */
export function registerCanvasGroup() {
	CONFIG.Canvas.groups[GROUP_KEY] = {
		parent: "interface",
		groupClass: class InstantRangeGroup extends PIXI.Container {
			async draw() {
				this.sortableChildren = true;
				this.zIndex = CONFIG.Canvas.groups.interface?.zIndexScrollingText ?? 0;
				this._state ??= createState(this);
				return this;
			}

			async tearDown() {
				const children = this.removeChildren();
				for (const child of children) child.destroy?.({ children: true });
				this._state = null;
			}
		}
	};
}

/**
 * Get the token id the renderer is currently tracking as hovered, if any.
 * Primarily used for other module code to query hover state without peeking at internals.
 * @returns {string|null}
 */
export function getCurrentHoveredTokenId() {
	const state = getState();
	return state?.hoveredTokenId ?? null;
}

/**
 * A hook event that fires when a token {@link foundry.canvas.placeables.Token} is hovered over or out.
 * @param {Token} The token that is being hovered over or out.
 * @param {boolean} true if called from `onHoverIn`, false if from `onHoverOut`
 * @returns void
 */
export function onHoverToken(token, isHovered) {
	// Get renderer state, and clear if the token is not hovered.
	const state = getState();
	if (!isHovered) return clear();

	// If the module is not enabled, return.
	if (!isEnabled()) return;

	// Get the controlled token, and return if user is hovering over their own token.
	const source = getControlledToken() ?? getUserCharacterToken();
	if (!source || source === token) return;

	// Set the current token ID, refresh the tooltip, and render the range.
	state.hoveredTokenId = token.id;
	token?._refreshTooltip?.();
	renderNow(state);
}

/**
 * A hook event that fires when a token {@link foundry.canvas.placeables.Token} is refreshed.
 * @param {Token} token - The token that is being refreshed.
 * @param {object} options - The options for the refresh.
 * @returns void
 */
export function onRefreshToken(token, options) {
	if (!isEnabled()) return;
	const state = getState();

	const controlled = getControlledToken() ?? getUserCharacterToken();
	const hoveredId = state.hoveredTokenId;
	if (!controlled || !hoveredId) return;

	const refreshedId = token?.id;
	const isControlled = controlled?.id === refreshedId;
	const isHovered = hoveredId === refreshedId;

	if (isControlled || isHovered) renderNow(state);
}

/**
 * Hook: clears range UI when control over a token is lost.
 * @param {Token} _token - The token whose control changed.
 * @param {boolean} controlled - True if now controlled; false if released.
 */
export function onControlToken(_token, controlled) {
	if (!controlled) clear();
}

/**
 * Hook: clear range UI when a token is deleted, but only if relevant to current hover/control.
 * @param {TokenDocument} tokenDocument
 */
export function onDeleteToken(tokenDocument) {
	const state = getState();
	const deletedId = tokenDocument?.id ?? tokenDocument?._id;
	// Clear UI only if the deleted token was the current hover target or the controller.
	const hoveredId = state.hoveredTokenId;
	const controlled = getControlledToken() ?? getUserCharacterToken();
	if ((hoveredId && hoveredId === deletedId) || (controlled && controlled.id === deletedId)) {
		clear();
	}
}

/**
 * Hook: clear UI on combat updates only if we currently have a hover target.
 * @param {Combat} _combat
 * @param {object} _changes
 * @param {object} _options
 * @param {string} _userId
 */
export function onUpdateCombat(_combat, _changes, _options, _userId) {
	const state = getState();
	// Reset hover UI on combat changes when we had an active hover target.
	if (state.hoveredTokenId) clear();
}

/**
 * Hook: clear UI when combat is deleted only if we currently have a hover target.
 * @param {Combat} _combat
 * @param {object} _options
 * @param {string} _userId
 */
export function onDeleteCombat(_combat, _options, _userId) {
	const state = getState();
	// Reset hover UI on combat deletion when we had an active hover target.
	if (state.hoveredTokenId) clear();
}

/**
 * Clear current hover state, hide UI, and restore the hovered token's tooltip.
 */
export function clear() {
	const working = getState();
	const previousHoveredId = working.hoveredTokenId;
	working.hoveredTokenId = null;

	hideLabel(working);
	if (previousHoveredId) restoreTooltip(previousHoveredId);
}

/**
 * Retrieve (or lazily create) the renderer state from the interface group container.
 * @returns {object|null} The state bag, or null if the group is unavailable.
 */
function getState() {
	const group = canvas?.interface?.[GROUP_KEY] ?? null;
	if (!group) throw new Error("Instant Range: canvas group is not registered on canvas.interface");
	if (!group._state) group._state = createState(group);
	return group._state;
}

/**
 * Build the persistent renderer state, including text styles and the shared label container.
 * @param {PIXI.Container} parkingContainer - The interface-layer container that owns the state.
 * @returns {object} State bag with UI elements and cached measurement metadata.
 */
function createState(interfaceContainer) {
	const baseStyle = BASE_TEXT_STYLE_PROPERTIES();

	const createLabel = (text, anchorX, anchorY, overrides = {}) => {

		// using PreciseText for better internal resolution.
		const label = new PreciseText(text, { ...baseStyle, ...overrides });
		label.anchor.set(anchorX, anchorY);
		label.resolution = 4;
		return label;
	};

	const distanceText = createLabel("", 0.5, 1.00, DISTANCE_TEXT_STYLE_PROPERTIES);
	
	// ruler-combined icon
	const iconText = createLabel("\uf546", 0.5, 1.15, ICON_TEXT_STYLE_PROPERTIES); 

	const tokenHudContainer = new PIXI.Container();
	tokenHudContainer.visible = false;
	tokenHudContainer.addChild(iconText, distanceText);
	tokenHudContainer.distanceText = distanceText;
	tokenHudContainer.iconText = iconText;

	interfaceContainer.addChild(tokenHudContainer);

	return {
		interfaceContainer,
		tokenHudContainer,
		distanceText,
		iconText,
		prevDistHash: null,
		prevDist: null,
		hoveredTokenId: null
	};
}

/**
 * Feature gate: only allow rendering when canvas is ready and either the setting
 * `allowHoverOutOfCombat` is true or there is an active combat.
 * @returns {boolean}
 */
function isEnabled() {
	if (!canvas?.ready) return false;
	if (!!game.combat?.active) return true;
	// Read cached flag from the module instance to avoid repeated settings lookups.
	return game.modules.get("instant-range").instance.settings.allowHoverOutOfCombat;
}

/**
 * Get the controlled token from the canvas if there is only one controlled token.
 * @returns {Token|null} The controlled token, or null if there is no controlled token.
 */
function getControlledToken() {
	const list = canvas.tokens?.controlled ?? [];
	return list.length === 1 ? list[0] : null;
}

/**
 * Get the user's character token if there is only one active token.
 * @returns {Token|null} The user's character token, or null if there is no active or multiple tokens.
 */
function getUserCharacterToken() {
	const user = game.user;
	if (!user || user.isGM) return null; // only bypass for players

	const actor = user.character;
	if (!actor) return null;

	// Actor#getActiveTokens(linked?: boolean, document?: boolean)
	const tokens = actor.getActiveTokens(false, false);
	return tokens.length === 1 ? tokens[0] : null;
}

/**
 * Compute all occupied grid centers for a token, respecting footprint offsets.
 * @param {Token} token
 * @param {number} elevation
 * @param {GridLayer} gridLayer
 * @returns {Array<{x:number, y:number, elevation:number}>}
 */
function getOccupiedCenters(token, elevation, gridLayer) {
	const center = { x: token.center.x, y: token.center.y, elevation };
	const offsets = token.document.getOccupiedGridSpaceOffsets();
	if (!offsets?.length) return [center];
	const points = [];
	for (const off of offsets) {
		const c = gridLayer.getCenterPoint(off);
		points.push({ x: c.x, y: c.y, elevation });
	}
	return points;
}

/**
 * Find the shortest path between two tokens, handling both gridless and gridded scenes.
 * Considers all occupied centers of source/target to pick the minimal measured distance.
 * @returns {{origin: object, dest: object, result: MeasuredTemplate}} Best path data.
 */
function getBestPathBetween(sourceToken, sourceElevation, targetToken, targetElevation, gridLayer) {
	if (gridLayer.isGridless) {
		const origin = { x: sourceToken.center.x, y: sourceToken.center.y, elevation: sourceElevation };
		const dest = { x: targetToken.center.x, y: targetToken.center.y, elevation: targetElevation };
		const result = gridLayer.measurePath([origin, dest]);
		return { origin, dest, result };
	}

	const sourcePoints = getOccupiedCenters(sourceToken, sourceElevation, gridLayer);
	const targetPoints = getOccupiedCenters(targetToken, targetElevation, gridLayer);

	let best = { origin: sourcePoints[0], dest: targetPoints[0], result: gridLayer.measurePath([sourcePoints[0], targetPoints[0]]) };
	let bestDistance = best.result?.distance ?? Infinity;
	if (bestDistance === 0) return best;

	for (const s of sourcePoints) {
		for (const t of targetPoints) {
			const r = gridLayer.measurePath([s, t]);
			const d = r?.distance ?? Infinity;
			if (d === 0) return { origin: s, dest: t, result: r };
			if (d < bestDistance) {
				best = { origin: s, dest: t, result: r };
				bestDistance = d;
			}
		}
	}

	return best;
}

/**
 * Core render step: validate state, measure distance, update label position, and display it.
 * @param {object} [state] - Renderer state; fetched if omitted.
 */
function renderNow(state) {
	const working = state ?? getState();
	if (!working) return;
	if (!isEnabled()) return clear();

	const controlled = getControlledToken() ?? getUserCharacterToken();
	const hoveredId = working.hoveredTokenId;
	if (!controlled || !hoveredId) return clear();

	const target = canvas.tokens?.placeables?.find(t => t.id === hoveredId) ?? null;
	if (!target || controlled === target) return clear();

	const measurement = getMeasurement(working, controlled, target);

	updateLabel(working, measurement, target);
	showLabel(working);
}

/**
 * Measure distance between source and target, with caching keyed by positions/elevations.
 * @returns {{text:string, distance:number, sourceElevation:number, targetElevation:number}}
 */
function getMeasurement(state, sourceToken, targetToken) {
	const sourceElevation = sourceToken.document?.elevation ?? sourceToken.elevation ?? 0;
	const targetElevation = targetToken.document?.elevation ?? targetToken.elevation ?? 0;
	const key = [
		sourceToken.id,
		targetToken.id,
		sourceElevation,
		targetElevation,
		sourceToken.center.x,
		sourceToken.center.y,
		targetToken.center.x,
		targetToken.center.y
	].join("|");
	if (key === state.prevDistHash && state.prevDist) return state.prevDist;

	const gridLayer = canvas.grid;
	const { result } = getBestPathBetween(sourceToken, sourceElevation, targetToken, targetElevation, gridLayer);
	const distance = result?.distance ?? 0;

	const units = gridLayer.units;
	const rounded = (typeof distance?.toNearest === "function") ? distance.toNearest(0.01) : Math.round(distance * 100) / 100;
	const text = ` ${rounded} ${units}`.trim();

	state.prevDistHash = key;
	state.prevDist = { text, distance, sourceElevation, targetElevation };
	return state.prevDist;
}

/**
 * Calculate vertical offset to avoid collision with HealthEstimate when positioned above token.
 * @param {Token} targetToken - The token being hovered.
 * @returns {number} Vertical offset in pixels (0 indicates no adjustment is needed).
 */
function calculateHealthEstimateOffset(targetToken) {
	// Only apply offset if HealthEstimate is active, positioned above, and has a valid visible text object
	if (game?.healthEstimate?.position !== "a") return 0;

	// Try to get the actual HealthEstimate text object for accurate height measurement
	// This accounts for padding, stroke, drop shadow, and actual text content
	const healthEstimateText = targetToken.healthEstimate;

	// Only proceed if we have a valid, visible text object
	if (!healthEstimateText?.height || !healthEstimateText.visible || !healthEstimateText.style) return 0;

	const he = game.healthEstimate;

	// Compute the same scaling factors HealthEstimate uses
	const gridScale = he.scaleToGridSize ? canvas.scene.dimensions.size / 100 : 1;
	const tokenScale = he.scaleToTokenSize ? targetToken.document.width : 1;

	// Use actual rendered height, accounting for the scale applied to the object
	// HealthEstimate scales the text object by: tokenScale * 0.25
	// Note: zoomLevel is already accounted for in the text object's height since
	// HealthEstimate creates the text with scaledFontSize which includes zoomLevel
	const visualHeight = healthEstimateText.height * (tokenScale * 0.25);

	// Calculate HealthEstimate's actual edges in pixel coordinates
	// HealthEstimate's y position is: -2 + he.height (anchor at bottom center)
	// Bottom edge (closest to token) = he.height - 2
	// Top edge (farthest from token) = he.height - 2 - visualHeight
	const healthEstimateBottom = he.height - 2;
	const healthEstimateTop = he.height - 2 - visualHeight;

	// Only adjust if HealthEstimate's bottom edge is high enough above the token
	// to avoid conflict; if it's too close, there's space underneath instead
	// Threshold scales with gridScale to maintain proportional behavior
	// TODO: replace magic numbers when font customization is implemented.
	const threshold = -28 * gridScale;
	if (healthEstimateBottom >= threshold) {
		// Position instant-range above HealthEstimate's top edge with appropriate gap
		// Gap scales with gridScale to maintain proportional spacing
		const gap = 22 * gridScale;
		return healthEstimateTop - gap;
	}

	return 0;
}

/**
 * Layout and position the shared label relative to the target token using the latest measurement.
 * Expects `state.labelContainer`, `distanceLabel`, and `iconLabel` to be present.
 */
function updateLabel(state, measurement, targetToken) {
	const labelContainer = state.tokenHudContainer;
	const { distanceText, iconText } = state;
	const uiScale = canvas.dimensions?.uiScale ?? 1;

	if (distanceText.text !== measurement.text) 
		distanceText.text = measurement.text;

	const gap = Math.max(8, Math.round(distanceText.height * 0.2));
	const totalWidth = iconText.width + gap + distanceText.width;

	// Horizontally center the icon + distance text combo, and vertically align their centers.
	const iconX = (-totalWidth / 2) + (iconText.width / 2);
	const distanceX = iconX + (iconText.width / 2) + gap + (distanceText.width / 2);

	iconText.position.set(iconX, 0);
	distanceText.position.set(distanceX, 0);

	const offsetY = calculateHealthEstimateOffset(targetToken);
	const tokenCenterX = targetToken.x + (targetToken.w / 2);
	const tokenCenterY = targetToken.y;
	labelContainer.position.set(tokenCenterX, tokenCenterY + offsetY);
	labelContainer.scale.set(uiScale);
}

/**
 * Hide the label.
 * @param {object} state - Renderer state.
 */
function hideLabel(state) {
	state.tokenHudContainer.visible = false;
}

/**
 * Show the label (container stays in interface layer).
 * @param {object} state - Renderer state.
 */
function showLabel(state) {
	state.tokenHudContainer.visible = true;
}

/**
 * Restore the Elevation tooltip of the token.
 * @param {string} tokenId - The ID of the token to restore the tooltip of.
 * @returns void
 */
function restoreTooltip(tokenId) {
	if (!tokenId) throw new Error("Instant Range: missing token id when attempting to restore tooltip");
	// Get the token, and refresh the tooltip.
	const token = canvas.tokens.placeables.find(tk => tk.id === tokenId);
	// Token may be gone (deleted or scene change); skip in that lifecycle case.
	if (token) token._refreshTooltip();
}
