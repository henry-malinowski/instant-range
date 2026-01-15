/**
 * Measurement result with formatted text and distance data.
 */
export interface MeasurementResult {
  text: string;
  distance: number;
  sourceElevation: number;
  targetElevation: number;
}

/**
 * Point with elevation for measurement calculations.
 */
interface Point3D {
  x: number;
  y: number;
  elevation: number;
}

/**
 * Internal measurement structure with origin, destination, and result.
 */
interface InternalMeasurement {
  origin: Point3D;
  dest: Point3D;
  result: { distance: number };
}

/**
 * Measure the distance between two tokens, respecting grid settings and elevation.
 * For gridless scenes, measures center-to-center. For gridded scenes, finds the nearest
 * occupied grid points between the tokens.
 * @param {Token} sourceToken - The source token
 * @param {Token} targetToken - The target token
 * @param {object} elevationData - Elevation data for both tokens
 * @param {number} elevationData.sourceElevation - Elevation of the source token
 * @param {number} elevationData.targetElevation - Elevation of the target token
 * @returns {{text: string, distance: number, sourceElevation: number, targetElevation: number}} Measurement result with formatted text
 * @see https://foundryvtt.com/api/classes/foundry.grid.BaseGrid.html#isgridless
 */
export function measureDistance(
  sourceToken: foundry.canvas.placeables.Token,
  targetToken: foundry.canvas.placeables.Token,
  {
    sourceElevation,
    targetElevation,
  }: { sourceElevation: number; targetElevation: number },
): MeasurementResult {
  const gridLayer = canvas.grid!;
  const { result } = gridLayer.isGridless
    ? measureCenterToCenter(
        sourceToken,
        sourceElevation,
        targetToken,
        targetElevation,
      )
    : measureNearestOccupiedPoints(
        sourceToken,
        sourceElevation,
        targetToken,
        targetElevation,
      );

  const distance = result.distance;
  const roundedDistance = Math.round(distance * 100) / 100;
  const formattedText = ` ${roundedDistance} ${gridLayer.units}`.trim();

  return {
    text: formattedText,
    distance,
    sourceElevation,
    targetElevation,
  };
}

/**
 * Measure distance center-to-center for gridless scenes.
 * @param {Token} sourceToken - The source token
 * @param {number} sourceElevation - Elevation of the source token
 * @param {Token} targetToken - The target token
 * @param {number} targetElevation - Elevation of the target token
 * @returns {{origin: {x: number, y: number, elevation: number}, dest: {x: number, y: number, elevation: number}, result: object}} Measurement result
 * @private
 * @see https://foundryvtt.com/api/classes/foundry.grid.GridlessGrid.html#measurepath
 */
function measureCenterToCenter(
  sourceToken: foundry.canvas.placeables.Token,
  sourceElevation: number,
  targetToken: foundry.canvas.placeables.Token,
  targetElevation: number,
): InternalMeasurement {
  const grid = canvas.grid!;
  const originPoint = {
    x: sourceToken.center.x,
    y: sourceToken.center.y,
    elevation: sourceElevation,
  };
  const destinationPoint = {
    x: targetToken.center.x,
    y: targetToken.center.y,
    elevation: targetElevation,
  };
  const measurementResult = grid.measurePath(
    [originPoint, destinationPoint],
    {},
  );
  return {
    origin: originPoint,
    dest: destinationPoint,
    result: measurementResult,
  };
}

/**
 * Measure distance using the nearest occupied grid points for gridded scenes.
 * For large tokens that occupy multiple grid spaces, finds the closest pair of occupied points.
 * @param {Token} sourceToken - The source token
 * @param {number} sourceElevation - Elevation of the source token
 * @param {Token} targetToken - The target token
 * @param {number} targetElevation - Elevation of the target token
 * @returns {{origin: {x: number, y: number, elevation: number}, dest: {x: number, y: number, elevation: number}, result: object}} Measurement result with nearest points
 * @private
 * @see https://foundryvtt.com/api/classes/foundry.canvas.placeables.Token.html#getcenterpoint
 * @see https://foundryvtt.com/api/classes/foundry.grid.BaseGrid.html#measurepath
 */
function measureNearestOccupiedPoints(
  sourceToken: foundry.canvas.placeables.Token,
  sourceElevation: number,
  targetToken: foundry.canvas.placeables.Token,
  targetElevation: number,
): InternalMeasurement {
  const grid = canvas.grid!;
  const sourceOccupiedPoints = getOccupiedCenters(sourceToken, sourceElevation);
  const targetOccupiedPoints = getOccupiedCenters(targetToken, targetElevation);

  const source0 = sourceOccupiedPoints[0]!;
  const target0 = targetOccupiedPoints[0]!;
  let bestMeasurement = {
    origin: source0,
    dest: target0,
    result: grid.measurePath([source0, target0], {}),
  };
  let bestDistance = bestMeasurement.result.distance;
  if (bestDistance === 0) return bestMeasurement;

  for (const sourcePoint of sourceOccupiedPoints) {
    for (const targetPoint of targetOccupiedPoints) {
      const measurementResult = grid.measurePath(
        [sourcePoint, targetPoint],
        {},
      );
      const measuredDistance = measurementResult.distance;
      if (measuredDistance === 0)
        return {
          origin: sourcePoint,
          dest: targetPoint,
          result: measurementResult,
        };
      if (measuredDistance < bestDistance) {
        bestMeasurement = {
          origin: sourcePoint,
          dest: targetPoint,
          result: measurementResult,
        };
        bestDistance = measuredDistance;
      }
    }
  }

  return bestMeasurement;
}

/**
 * Get the center points of all grid spaces occupied by a token.
 * For single-space tokens, returns just the token center. For multi-space tokens,
 * returns the center of each occupied grid space.
 * @param {Token} token - The token to get occupied centers for
 * @param {number} elevation - The elevation to assign to all points
 * @returns {Array<{x: number, y: number, elevation: number}>} Array of center points with elevation
 * @private
 * @see https://foundryvtt.com/api/classes/foundry.documents.TokenDocument.html#getoccupiedgridspaceoffsets
 * @see https://foundryvtt.com/api/classes/foundry.canvas.placeables.Token.html#getcenterpoint
 */
function getOccupiedCenters(
  token: foundry.canvas.placeables.Token,
  elevation: number,
): Point3D[] {
  const gridLayer = canvas.grid!;
  const tokenCenter = {
    x: token.center.x,
    y: token.center.y,
    elevation,
  };
  const occupiedOffsets = token.document.getOccupiedGridSpaceOffsets();
  if (!occupiedOffsets.length) return [tokenCenter];

  const occupiedCenters = [];
  for (const gridOffset of occupiedOffsets) {
    // getOccupiedGridSpaceOffsets() returns a type incompatible with getCenterPoint()'s expected parameter
    // according to fvtt-types, but they are compatible at runtime.
    const gridCenterPoint = gridLayer.getCenterPoint(
      gridOffset as unknown as Parameters<typeof gridLayer.getCenterPoint>[0],
    );
    occupiedCenters.push({
      x: gridCenterPoint.x,
      y: gridCenterPoint.y,
      elevation,
    });
  }
  return occupiedCenters;
}
