/**
 * Get the currently controlled token, if exactly one is controlled.
 * @returns {foundry.canvas.placeables.Token|null} The controlled token, or null if zero or multiple tokens are controlled
 * @see https://foundryvtt.com/api/classes/foundry.canvas.layers.TokenLayer.html#controlled
 */
export function getControlledToken(): foundry.canvas.placeables.Token | null {
  const controlledTokens = canvas.tokens?.controlled;
  if (!controlledTokens) return null;

  if (controlledTokens.length !== 1) return null;
  return controlledTokens[0] ?? null;
}

/**
 * Get the user's character token, if the user has exactly one character token on the current scene.
 * @note Returns null for GMs (who don't have a character) or if there are zero or multiple character tokens.
 * @returns {foundry.canvas.placeables.Token|null} The user's character token, or null if unavailable
 * @see https://foundryvtt.com/api/classes/foundry.documents.Actor.html#getactivetokens
 */
export function getUserCharacterToken(): foundry.canvas.placeables.Token | null {
  const currentUser = game.user;
  if (currentUser.isGM) return null;

  const userCharacter = currentUser.character;
  if (!userCharacter) return null;

  const characterTokens = userCharacter.getActiveTokens(false, false);

  if (characterTokens.length !== 1) return null;
  return characterTokens[0] ?? null;
}

/**
 * Get the base source token (controlled or character token, never a preview).
 * @returns {Token|null} The base source token, or null if neither is available
 */
export function getBaseSourceToken(): foundry.canvas.placeables.Token | null {
  return getControlledToken() ?? getUserCharacterToken();
}

/**
 * Get the source token for distance measurements.
 * Prefers the controlled token if available, otherwise falls back to the user's character token.
 * If the source token is being dragged, returns the preview token instead.
 * @returns {Token|null} The source token (or preview if dragging), or null if neither is available
 * @note Preview may not always exist (WASD movement, moved by another user, etc.)
 */
export function getSourceToken(): foundry.canvas.placeables.Token | null {
  const baseToken = getBaseSourceToken();
  if (!baseToken) return null;

  // Check if the token is being dragged
  // isDragged is a public property that exists at runtime but may not be in fvtt-types
  const isDragged = (baseToken as any).isDragged;
  if (!isDragged) return baseToken;

  // Token is being dragged - search TokenLayer's preview container
  const previewContainer = canvas.tokens?.preview;
  const preview = previewContainer?.children.find((t: any) => {
    if (!t.isPreview || t.destroyed) return false;
    const previewBaseId = t.sourceId.replace(/\.preview$/, "");
    return previewBaseId === baseToken.sourceId;
  }) as foundry.canvas.placeables.Token | undefined;

  return preview && !preview.destroyed ? preview : baseToken;
}

/**
 * Check if a token is visible within the current viewport.
 * A token is considered visible if it's both marked as visible/renderable and its center
 * point is within the canvas screen bounds.
 * @param {foundry.canvas.placeables.Token} token The token to check
 * @returns {boolean} True if the token is visible in the viewport
 * @see https://foundryvtt.com/api/classes/foundry.canvas.placeables.Token.html#isVisible
 * @see https://pixijs.download/dev/docs/maths.Point.html
 * @see https://pixijs.download/dev/docs/app.Application.html#screen
 */
export function isTokenVisible(
  token: foundry.canvas.placeables.Token,
): boolean {
  if (!token.isVisible || !token.renderable) return false;
  const tokenCenterGlobal = token.toGlobal(
    new PIXI.Point(token.w / 2, token.h / 2),
  );
  return canvas.app!.screen.contains(tokenCenterGlobal.x, tokenCenterGlobal.y);
}

/**
 * Check if a token refresh indicates positional or size movement.
 * @param {Record<string, boolean>} flags - Render flags indicating what was refreshed.
 */
export function didTokenMove(flags: Record<string, boolean> = {}): boolean {
  return (
    !!flags.refreshPosition || !!flags.refreshElevation || !!flags.refreshSize
  );
}
