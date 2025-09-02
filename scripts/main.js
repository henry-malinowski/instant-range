const MODULE_ID = "instant-range";

class InstantRange {
	static PixiContainer = null;
	static labelText = null;
	static currentTokenId = null;
	static _rafId = null;

	static BASE_TEXT_STYLE_PROPERTIES = {
		fill: 0xFFFFFF,
		stroke: 0x000000,
		strokeThickness: 10,
		align: "center",
		dropShadow: true,
		dropShadowColor: 0x000000,
		dropShadowBlur: 2,
		dropShadowAngle: Math.PI / 6,
		dropShadowDistance: 2,
		padding: 6,
		lineJoin: "round"
	};

	static DISTANCE_TEXT_STYLE_PROPERTIES = {
		fontWeight: "bold"
	};

	static ICON_TEXT_STYLE_PROPERTIES = {
		fontFamily: "Font Awesome 6 Pro",
		fontWeight: 900
	};

	static SETTINGS = [
		{
			id: "allowHoverOutOfCombat",
			name: "instant-range.SETTINGS.allowHoverOutOfCombatName",
			hint: "instant-range.SETTINGS.allowHoverOutOfCombatHint",
			config: true,
			type: Boolean,
			default: false,
			scope: "world",
			restricted: true
		},
		{
			id: "realtimeUpdate",
			name: "instant-range.SETTINGS.realtimeUpdateName",
			hint: "instant-range.SETTINGS.realtimeUpdateHint",
			config: true,
			type: Boolean,
			default: true,
			requiresReload: true,
			scope: "world",
			restricted: true
		}
	];

	static libWrapperReady() {
		if (typeof libWrapper !== "function") return;
	
		libWrapper.register(MODULE_ID, "foundry.canvas.placeables.Token.prototype._getTooltipText", function (wrapped, ...args) {
			const originalText = wrapped.apply(this, args);
			if (InstantRange.currentTokenId && this?.id === InstantRange.currentTokenId) return "";
			return originalText;
		}, "WRAPPER");
	}
	
	static init() {
		for (const setting of InstantRange.SETTINGS) {
			game.settings.register(MODULE_ID, setting.id, {
				...setting
			});
		}
	}

	static ready() {
		// Register common hooks
		for (const hook of InstantRange.COMMON_HOOKS) {
			Hooks.on(hook.name, hook.callback);
		}

		const realtime = game.settings.get(MODULE_ID, "realtimeUpdate");
		if (realtime) Hooks.on("refreshToken", InstantRange.onRefreshToken);
	}

	static _onControlToken(_token, controlled) {
		if (!controlled) InstantRange.clear();
	}

	static _onCanvasReady() {
		InstantRange._ensureContainer();
	}

	static _onCanvasTearDown() {
		InstantRange.PixiContainer = null;
		InstantRange.labelText = null;
	}

	static _renderIfPossible() {
		if (!InstantRange.isEnabled()) return InstantRange.clear();
		const controlled = InstantRange.getControlledToken();
		const hoveredId = InstantRange.currentTokenId;
		if (!controlled || !hoveredId) return InstantRange.clear();
		const target = canvas.tokens?.placeables?.find(t => t.id === hoveredId) ?? null;
		if (!target) return InstantRange.clear();
		if (controlled === target) return InstantRange.clear();
		InstantRange.renderDistance(controlled, target);
	}

	static scheduleRender() {
		if (InstantRange._rafId) return;
		InstantRange._rafId = requestAnimationFrame(() => {
			InstantRange._rafId = null;
			try { InstantRange._renderIfPossible(); } catch {}
		});
	}

	static _onCanvasPan(_canvas, _position) {
		try { InstantRange.scheduleRender(); } catch {}
	}

	static COMMON_HOOKS = [
		{ name: "canvasReady", callback: InstantRange._onCanvasReady },
		{ name: "hoverToken", callback: InstantRange.onHoverToken },
		{ name: "controlToken", callback: InstantRange._onControlToken },
		{ name: "deleteToken", callback: InstantRange.clear },
		{ name: "updateCombat", callback: InstantRange.clear },
		{ name: "deleteCombat", callback: InstantRange.clear },
		{ name: "canvasPan", callback: InstantRange._onCanvasPan },
		{ name: "canvasTearDown", callback: InstantRange._onCanvasTearDown }
	];

	static isEnabled() {
		if (game.settings.get(MODULE_ID, "allowHoverOutOfCombat")) return true;
		return !!game.combat?.active;
	}

	static getControlledToken() {
		const list = canvas.tokens?.controlled ?? [];
		return list.length === 1 ? list[0] : null;
	}

	static onHoverToken(token, hovered) {
		try {
			if (!hovered) return InstantRange.clear();
			if (!InstantRange.isEnabled()) return;
			const source = InstantRange.getControlledToken();
			if (!source || source === token) return;
			InstantRange.currentTokenId = token.id;
			try { token._refreshTooltip?.(); } catch {}
			InstantRange._renderIfPossible();
		} catch (e) {
			console.error(`${MODULE_ID} | onHoverToken error`, e);
		}
	}

	static onRefreshToken(token) {
		try {
			if (!InstantRange.isEnabled()) return;

			const controlled = InstantRange.getControlledToken();
			const hoveredId = InstantRange.currentTokenId;

			if (!controlled || !hoveredId) return;

			const refreshedId = token?.id;
			const isControlled = controlled?.id === refreshedId;
			const isHovered = hoveredId === refreshedId;

			if (!(isControlled || isHovered)) return;
			
			InstantRange.scheduleRender();
		} catch { }
	}


	static renderDistance(sourceToken, targetToken) {
		InstantRange._ensureContainer();
		if (InstantRange.labelText) {
			InstantRange.PixiContainer.removeChild(InstantRange.labelText);
			InstantRange.labelText.destroy();
			InstantRange.labelText = null;
		}

		const sourceElevation = sourceToken.document?.elevation ?? sourceToken.elevation ?? 0;
		const targetElevation = targetToken.document?.elevation ?? targetToken.elevation ?? 0;
		const gridLayer = canvas.grid;
		const { result } = InstantRange._getBestPathBetween(sourceToken, sourceElevation, targetToken, targetElevation, gridLayer);
		const distance = result?.distance ?? 0;

		const units = gridLayer.units ?? canvas.scene?.grid?.units ?? "";
		const rounded = (typeof distance?.toNearest === "function") ? distance.toNearest(0.01) : Math.round(distance * 100) / 100;
		const text = ` ${rounded} ${units}`.trim();

		InstantRange._drawDistanceLabel(targetToken, text);
	}

	static _getOccupiedCenters(token, elevation, gridLayer) {
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

	static _getBestPathBetween(sourceToken, sourceElevation, targetToken, targetElevation, gridLayer) {
		// Gridless: just center-to-center
		if (gridLayer.isGridless) {
			const origin = { x: sourceToken.center.x, y: sourceToken.center.y, elevation: sourceElevation };
			const dest = { x: targetToken.center.x, y: targetToken.center.y, elevation: targetElevation };
			const result = gridLayer.measurePath([origin, dest]);
			return { origin, dest, result };
		}

		// All other cases: find the best path between the centers of the occupied grid spaces
		const sourcePoints = InstantRange._getOccupiedCenters(sourceToken, sourceElevation, gridLayer);
		const targetPoints = InstantRange._getOccupiedCenters(targetToken, targetElevation, gridLayer);

		let best = { origin: sourcePoints[0], dest: targetPoints[0], result: gridLayer.measurePath([sourcePoints[0], targetPoints[0]]) };
		let bestDistance = best.result?.distance ?? Infinity;
		if (bestDistance === 0) return best; // If the distance is 0, we can return early

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


	static _drawDistanceLabel(targetToken, text) {
		// Compute scaled font size for crisp rendering at various zoom levels
		const baseFontSize = 20; // px
		const gridScale = canvas.scene?.dimensions?.size ? (canvas.scene.dimensions.size / 100) : 1;
		const zoomLevel = Math.min(1, canvas.stage.scale.x || 1);
		const scaledFontSize = ((baseFontSize * gridScale) / zoomLevel) * 4;

		// Calculate vertical offset (considering Health Estimate overlay if present)
		const heActive = game.modules.get("healthEstimate")?.active;
		const offsetY = (targetToken.h / 2) + 18 + (heActive ? 14 : 0);

		// Base style shared by icon and text
		const baseStyle = {
			...InstantRange.BASE_TEXT_STYLE_PROPERTIES,
			fontSize: scaledFontSize
		};

		// Distance text style
		const textStyle = new PIXI.TextStyle({
			...baseStyle,
			...InstantRange.DISTANCE_TEXT_STYLE_PROPERTIES
		});
		const label = new PIXI.Text(text, textStyle);
		label.anchor.set(0.5, 1);

		// Font Awesome icon (to the left of the text)
		const iconGlyph = "\uf546"; // FA6 Pro glyph
		const iconStyle = new PIXI.TextStyle({
			...baseStyle,
			...InstantRange.ICON_TEXT_STYLE_PROPERTIES
		});
		const icon = new PIXI.Text(iconGlyph, iconStyle);
		icon.anchor.set(1, 1);

		// Layout: center the combined icon+label group on the token
		const gap = Math.max(8, Math.round(scaledFontSize * 0.2));
		// Measure widths before positioning
		const totalWidth = icon.width + gap + label.width;
		icon.position.set((-totalWidth / 2) + icon.width, 0);
		label.position.set((-totalWidth / 2) + icon.width + gap + (label.width / 2), 0);

		// Group container for icon + label
		const groupedPixiContainer = new PIXI.Container();
		groupedPixiContainer.zIndex = CONFIG.Canvas.groups.interface.zIndexScrollingText;
		groupedPixiContainer.addChild(icon, label);
		groupedPixiContainer.position.set(targetToken.center.x, targetToken.center.y - offsetY);
		groupedPixiContainer.scale.set(0.25);

		InstantRange.labelText = groupedPixiContainer;
		InstantRange.PixiContainer.addChild(groupedPixiContainer);
	}

	static clear() {
		const previousHoveredId = InstantRange.currentTokenId;
		InstantRange.currentTokenId = null;
		if (InstantRange._rafId) { cancelAnimationFrame(InstantRange._rafId); InstantRange._rafId = null; }
		if (InstantRange.labelText) {
			InstantRange.PixiContainer?.removeChild(InstantRange.labelText);
			InstantRange.labelText.destroy();
			InstantRange.labelText = null;
		}

		// Restore elevation text
		if (previousHoveredId) {
			try {
				const t = canvas.tokens?.placeables?.find(tk => tk.id === previousHoveredId);
				if (t) t._refreshTooltip?.();
			} catch {}
		}
	}

	static _ensureContainer() {
		if (!InstantRange.PixiContainer) {
			InstantRange.PixiContainer = new PIXI.Container();
			InstantRange.PixiContainer.sortableChildren = false;
			InstantRange.PixiContainer.zIndex = CONFIG.Canvas.groups.interface.zIndexScrollingText;
			canvas.interface.addChild(InstantRange.PixiContainer);
		}
	}
}

Hooks.once("init", InstantRange.init);
Hooks.once("ready", InstantRange.ready);
Hooks.once("libWrapper.Ready", InstantRange.libWrapperReady);
