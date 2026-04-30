# Changelog

## [v3.0.2](https://github.com/henry-malinowski/instant-range/releases/tag/v3.0.2) - 2026-04-30

### Fixed

- Distance labels showing a missing glyph box in V14.359 and higher. ([#17](https://github.com/henry-malinowski/instant-range/issues/17))

## [v3.0.1](https://github.com/henry-malinowski/instant-range/releases/tag/v3.0.1) - 2026-02-01

### Fixed

- Fixed issue where the distance label didn't correctly include the derived Y offset for health estimate.

### Changes

- Shrunk the size of the distance icon and text, to be less obtrusive.
  - More customization coming in the future, this is just a stop gap.

## [v3.0.0](https://github.com/henry-malinowski/instant-range/releases/tag/v3.0.0) - 2026-01-15

### Added

- Added feature to allow `canvas.tokens.highlightObjects` to show distances for all visible tokens. ([#5](https://github.com/henry-malinowski/instant-range/issues/5))
- Instant Range now displays the distance to a targetted token from the controlled token. ([#10](https://github.com/henry-malinowski/instant-range/issues/10))

### Fixed

- Fixed bug where hovering didn't occur after a scene switch. ([#9](https://github.com/henry-malinowski/instant-range/issues/9))

## [v2.0.3](https://github.com/henry-malinowski/instant-range/releases/tag/v2.0.3) - 2026-01-03

### Fixed

- Distance text not detecting active combat. ([#8](https://github.com/henry-malinowski/instant-range/issues/8))

## [v2.0.2](https://github.com/henry-malinowski/instant-range/releases/tag/v2.0.2) - 2025-12-19

### Fixed

- Distance text appearing underneath tokens. ([#4](https://github.com/henry-malinowski/instant-range/issues/4))

## [v2.0.1](https://github.com/henry-malinowski/instant-range/releases/tag/v2.0.1) - 2025-12-19

### Changes

- Improved compatibility with [Health Estimate](https://github.com/mclemente/healthEstimate) in the top position.

## [v2.0.0](https://github.com/henry-malinowski/instant-range/releases/tag/v2.0.0) - 2025-12-18

### Added

- Players no longer need to select their token before measuring distance.
  - Distance is automatic if the user has a player character configured and there is exactly one instance of that token in the scene.
- Notifications for failed wrapper initialization and possible conflicting modules.

### Changes

- Switched to using Foundry's `PreciseText` class to improve presentation of range text.
- Instant range accounts for [Health Estimate's](https://github.com/mclemente/healthEstimate)'s position and font size to position itself accordingly.

## [v1.0.1](https://github.com/henry-malinowski/instant-range/releases/tag/v1.0.1) - 2025-09-02

### Added

- Spanish localization; feedback on the translation is appreciated.
