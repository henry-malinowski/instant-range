import { measureDistance, type MeasurementResult } from "./measurement.ts";

/**
 * Cache entry storing delta vectors and measurement result.
 */
interface CacheEntry {
  dx: number;
  dy: number;
  dz: number;
  measurement: MeasurementResult;
}

/**
 * MeasurementCache - Encapsulates measurement caching logic with position validation.
 * Provides a clean interface for token-to-measurement lookups while abstracting
 * the internal Map structure for future flexibility.
 */
export class MeasurementCache {
  #cache = new Map<string, CacheEntry>(); // Map<"tokenId1|tokenId2", CacheEntry> where tokenId1 < tokenId2

  /**
   * Get measurement for token pair, using cache if valid, otherwise calculating and caching.
   * Cache entries are validated by comparing position delta vectors to detect token movement.
   * @param {Token} sourceToken - Source token (should be effective token from renderer)
   * @param {Token} targetToken - Target token
   * @returns {{text: string, distance: number, sourceElevation: number, targetElevation: number}} Measurement result with formatted text
   * @see https://foundryvtt.com/api/classes/foundry.canvas.placeables.Token.html#sourceid
   * @see https://foundryvtt.com/api/classes/foundry.documents.TokenDocument.html#defineschema
   */
  getMeasurement(
    sourceToken: foundry.canvas.placeables.Token,
    targetToken: foundry.canvas.placeables.Token,
  ): MeasurementResult {
    const sourceElevation = sourceToken.document.elevation;
    const targetElevation = targetToken.document.elevation;

    // Generate ordered cache key (exploits bidirectional symmetry)
    const sourceId = sourceToken.sourceId;
    const targetId = targetToken.sourceId;
    const cacheKey =
      sourceId < targetId
        ? `${sourceId}|${targetId}`
        : `${targetId}|${sourceId}`;

    // Compute current delta vector (using absolute values since distance is symmetric)
    const deltaX = Math.abs(targetToken.center.x - sourceToken.center.x);
    const deltaY = Math.abs(targetToken.center.y - sourceToken.center.y);
    const deltaZ = Math.abs(targetElevation - sourceElevation);

    // Check cache using delta vector comparison, this helps retain cache hits when moveMany is used.
    // @see https://foundryvtt.com/api/classes/foundry.canvas.layers.TokenLayer.html#movemany
    const cachedEntry = this.#cache.get(cacheKey);
    if (
      cachedEntry &&
      cachedEntry.dx === deltaX &&
      cachedEntry.dy === deltaY &&
      cachedEntry.dz === deltaZ
    ) {
      return cachedEntry.measurement;
    }

    // Cache miss: calculate measurement and store with delta vector
    const measurement = measureDistance(sourceToken, targetToken, {
      sourceElevation,
      targetElevation,
    });

    this.#cache.set(cacheKey, {
      dx: deltaX,
      dy: deltaY,
      dz: deltaZ,
      measurement,
    });

    return measurement;
  }

  /**
   * Invalidate all cache entries for a given token (both as source and target).
   * @param {string} tokenSourceId The sourceId of the token to invalidate (e.g., "Token.abc123")
   */
  invalidateToken(tokenSourceId: string): void {
    for (const [cacheKey] of this.#cache) {
      const [firstTokenId, secondTokenId] = cacheKey.split("|");
      if (firstTokenId === tokenSourceId || secondTokenId === tokenSourceId) {
        this.#cache.delete(cacheKey);
      }
    }
  }

  /**
   * Clear all cached measurements.
   */
  clear(): void {
    this.#cache.clear();
  }
}
