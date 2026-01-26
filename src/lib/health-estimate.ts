import type { TokenWithHealthEstimate } from "health-estimate-types";

/**
 * Computes vertical offset to avoid overlapping Health Estimate module UI.
 * Only applies offset when Health Estimate is positioned above tokens (position "a").
 * @param {foundry.canvas.placeables.Token} targetToken - The token to calculate offset for
 * @returns {number} Vertical offset in pixels (negative values move label upward)
 * @see https://github.com/mclemente/healthEstimate
 */
export function calculateHealthEstimateOffset(
  targetToken: foundry.canvas.placeables.Token,
): number {
  const healthEstimate = game.healthEstimate;
  if (!healthEstimate?.position || healthEstimate.position !== "a") {
    return 0;
  }

  const tokenHealthEstimate = (targetToken as TokenWithHealthEstimate)
    .healthEstimate;
  if (
    !tokenHealthEstimate?.height ||
    !tokenHealthEstimate.visible ||
    !tokenHealthEstimate.style
  ) {
    return 0;
  }

  if (!canvas?.scene) return 0;

  const gridScale = healthEstimate.scaleToGridSize
    ? canvas.scene.dimensions.size / 100
    : 1;
  const tokenScale = healthEstimate.scaleToTokenSize
    ? targetToken.document.width
    : 1;
  const healthEstimateVisualHeight =
    tokenHealthEstimate.height * (tokenScale * 0.25);

  const healthEstimateBottomY = healthEstimate.height - 2;
  const healthEstimateTopY =
    healthEstimate.height - 2 - healthEstimateVisualHeight;

  const overlapThreshold = -28 * gridScale;
  if (healthEstimateBottomY >= overlapThreshold) {
    const spacingGap = 22 * gridScale;
    return healthEstimateTopY - spacingGap;
  }

  return 0;
}
