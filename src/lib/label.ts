import {
  getBaseTextStyle,
  getDistanceValueStyle,
  getIconTextStyle,
  getUnitsTextStyle,
} from "./text-styles.ts";

const { PreciseText } = foundry.canvas.containers;

/**
 * Label container with custom properties for icon, distance value, and units text.
 */
export interface LabelContainer extends PIXI.Container {
  iconText: InstanceType<typeof PreciseText>;
  distanceValue: InstanceType<typeof PreciseText>;
  unitsText: InstanceType<typeof PreciseText>;
}

/**
 * Measurement data for label display.
 */
export interface MeasurementData {
  distanceValue: string;
  units: string;
  distance: number;
}

/**
 * Create a new PIXI container for a distance label.
 * The container includes an icon (ruler icon), distance value, and units text.
 * @returns {PIXI.Container} A container with iconText, distanceValue, and unitsText children, plus those properties attached
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

  const distanceValue = new PreciseText("", {
    ...baseTextStyle,
    ...getDistanceValueStyle(),
  });
  distanceValue.anchor.set(0.5, 1.0);
  distanceValue.resolution = 4;

  const unitsText = new PreciseText("", {
    ...baseTextStyle,
    ...getUnitsTextStyle(),
  });
  unitsText.anchor.set(0.5, 1.03);
  unitsText.resolution = 4;

  labelContainer.addChild(iconText, distanceValue, unitsText);
  labelContainer.iconText = iconText;
  labelContainer.distanceValue = distanceValue;
  labelContainer.unitsText = unitsText;
  return labelContainer;
}

/**
 * Update a label container with new measurement data and position it relative to a token.
 * @param {PIXI.Container} labelContainer The label container to update (from createLabelContainer)
 * @param {{distanceValue: string, units: string, distance: number}} measurement The measurement data to display
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
  const { distanceValue, unitsText, iconText } = labelContainer;
  const uiScale = ((canvas?.dimensions as any)?.uiScale ?? 1) as number;

  if (distanceValue.text !== measurement.distanceValue)
    distanceValue.text = measurement.distanceValue;
  if (unitsText.text !== measurement.units) unitsText.text = measurement.units;

  const iconGap = Math.max(8, Math.round(distanceValue.height * 0.2));
  const unitsGap = iconGap * 0.6;
  const totalLabelWidth =
    iconText.width + iconGap + distanceValue.width + unitsGap + unitsText.width;

  const iconX = -totalLabelWidth / 2 + iconText.width / 2;
  const valueX = iconX + iconText.width / 2 + iconGap + distanceValue.width / 2;
  const unitsX = valueX + distanceValue.width / 2 + unitsGap + unitsText.width / 2;

  iconText.position.set(iconX, 0);
  distanceValue.position.set(valueX, 0);
  unitsText.position.set(unitsX, 0);

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
