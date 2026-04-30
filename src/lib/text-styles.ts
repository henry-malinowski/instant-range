/**
 * Base font size for numeric distance value.
 * Icon and units sizes are derived from this using multipliers.
 */
const BASE_DISTANCE_FONT_SIZE = 26;

/**
 * Get the base text style used by all label text elements.
 * Extends Foundry's default canvas text style with white fill and black stroke.
 * @returns {TextStyle} PIXI text style object
 * @see https://foundryvtt.com/api/variables/CONFIG.canvasTextStyle.html
 */
export function getBaseTextStyle(): Partial<PIXI.TextStyle> {
  return {
    ...CONFIG.canvasTextStyle,
    fill: 0xffffff,
    stroke: 0x000000,
    strokeThickness: 4,
    align: "center",
    padding: 11,
    lineJoin: "round",
  };
}

/**
 * Get the text style for the ruler icon (Font Awesome icon).
 * @returns {TextStyle} PIXI text style object with Font Awesome Pro font settings
 */
export function getIconTextStyle(): Partial<PIXI.TextStyle> & {
  fontSize: number;
} {
  return {
    fontFamily: ["Font Awesome 7 Pro", "Font Awesome 6 Pro"],
    fontWeight: "900",
    fontSize: BASE_DISTANCE_FONT_SIZE * 0.7,
  };
}

/**
 * Get the text style for the distance numeric value.
 * This is the base reference size that icon and units are derived from.
 * @returns {TextStyle} PIXI text style object
 */
export function getDistanceValueStyle(): Partial<PIXI.TextStyle> {
  return {
    fontWeight: "bold",
    fontSize: BASE_DISTANCE_FONT_SIZE,
  };
}

/**
 * Get the text style for the units text (e.g., "ft", "m").
 * Uses a multiplier on the base distance font size for visual alignment.
 * @returns {TextStyle} PIXI text style object
 */
export function getUnitsTextStyle(): Partial<PIXI.TextStyle> {
  return {
    fontWeight: "bold",
    fontSize: BASE_DISTANCE_FONT_SIZE * 0.9,
  };
}
