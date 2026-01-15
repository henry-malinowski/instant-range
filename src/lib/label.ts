import {
  getBaseTextStyle,
  getDistanceTextStyle,
  getIconTextStyle,
} from "./text-styles.ts";

const { PreciseText } = foundry.canvas.containers;

/**
 * Label container with custom properties for icon and distance text.
 */
export interface LabelContainer extends PIXI.Container {
  iconText: InstanceType<typeof PreciseText>;
  distanceText: InstanceType<typeof PreciseText>;
}

/**
 * Measurement data for label display.
 */
export interface MeasurementData {
  text: string;
  distance: number;
}

/**
 * Create a new PIXI container for a distance label.
 * The container includes both an icon (ruler icon) and distance text.
 * @returns {PIXI.Container} A container with iconText and distanceText children, plus those properties attached
 * @see https://foundryvtt.com/api/classes/foundry.canvas.containers.PreciseText.html
 */
export function createLabelContainer(): LabelContainer {
  const baseTextStyle = getBaseTextStyle();
  const labelContainer = new PIXI.Container() as LabelContainer;

  const iconText = new PreciseText("\uf546", {
    ...baseTextStyle,
    ...getIconTextStyle(),
  });
  iconText.anchor.set(0.5, 1.15);
  iconText.resolution = 4;

  const distanceText = new PreciseText("", {
    ...baseTextStyle,
    ...getDistanceTextStyle(),
  });
  distanceText.anchor.set(0.5, 1.0);
  distanceText.resolution = 4;

  labelContainer.addChild(iconText, distanceText);
  labelContainer.iconText = iconText;
  labelContainer.distanceText = distanceText;
  return labelContainer;
}

/**
 * Update a label container with new measurement data and position it relative to a token.
 * @param {PIXI.Container} labelContainer The label container to update (from createLabelContainer)
 * @param {{text: string, distance: number}} measurement The measurement data to display
 * @param {foundry.canvas.placeables.Token} targetToken The token this label is associated with
 * @param {(token: foundry.canvas.placeables.Token) => number} [offsetCallback] Optional callback to calculate vertical offset (e.g., for Health Estimate compatibility)
 * @description `uiScale` exists at runtime (Foundry), but isn't currently represented in the fvtt-types `Dimensions` type.
 * Fall back to 1 if unavailable to preserve existing behavior.
 * @see https://foundryvtt.com/api/classes/foundry.canvas.Canvas.html#dimensions
 */
export function updateLabel(
  labelContainer: LabelContainer,
  measurement: MeasurementData,
  targetToken: foundry.canvas.placeables.Token,
  offsetCallback: (token: foundry.canvas.placeables.Token) => number = () => 0,
): void {
  const { distanceText, iconText } = labelContainer;
  const uiScale = ((canvas?.dimensions as any)?.uiScale ?? 1) as number;

  if (distanceText.text !== measurement.text)
    distanceText.text = measurement.text;

  const gapBetweenElements = Math.max(8, Math.round(distanceText.height * 0.2));
  const totalLabelWidth =
    iconText.width + gapBetweenElements + distanceText.width;

  const iconX = -totalLabelWidth / 2 + iconText.width / 2;
  const distanceX =
    iconX + iconText.width / 2 + gapBetweenElements + distanceText.width / 2;

  iconText.position.set(iconX, 0);
  distanceText.position.set(distanceX, 0);

  const verticalOffset = offsetCallback(targetToken) ?? 0;
  const tokenCenterX = targetToken.x + targetToken.w / 2;
  const tokenCenterY = targetToken.y;
  labelContainer.position.set(tokenCenterX, tokenCenterY + verticalOffset);
  labelContainer.scale.set(uiScale);
}

/**
 * Hide a label container.
 * @param {PIXI.Container} labelContainer - The label container to hide
 */
export function hideLabel(labelContainer: LabelContainer): void {
  labelContainer.visible = false;
}

/**
 * Show a label container.
 * @param {PIXI.Container} labelContainer - The label container to show
 */
export function showLabel(labelContainer: LabelContainer): void {
  labelContainer.visible = true;
}
