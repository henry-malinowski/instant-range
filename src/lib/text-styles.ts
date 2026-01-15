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
    strokeThickness: 5,
    align: "center",
    padding: 10,
    lineJoin: "round",
  };
}

/**
 * Get the text style for the ruler icon (Font Awesome icon).
 * @returns {TextStyle} PIXI text style object with Font Awesome 6 Pro font settings
 */
export function getIconTextStyle(): Partial<PIXI.TextStyle> & {
  fontSize: number;
} {
  return {
    fontFamily: "Font Awesome 6 Pro",
    fontWeight: "900",
    fontSize: 24,
  };
}

/**
 * Get the text style for the distance text.
 * Uses a larger font size than the icon (1.25x) and bold weight.
 * @returns {TextStyle} PIXI text style object
 */
export function getDistanceTextStyle(): Partial<PIXI.TextStyle> {
  return {
    fontWeight: "bold",
    fontSize: 1.25 * getIconTextStyle().fontSize,
  };
}
