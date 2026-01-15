## v3.0.0

- Fixed bug where hovering didn't occur after a scene switch. (issue #9)
  - This spawned a whole (challenging) rewrite that has been greatly beneficial to align this module's function with the FoundryVTT canvas lifecycle.
- Added feature to allow `canvas.tokens.highlightObjects` to show distances for all visible tokens. (issue #5)
- Instant Range now displays the distance to a targetted token from the controlled token. (issue #10)

## v2.0.3

- Fixed distance text not correctly detecting active combat. (fixes issue #8)

## v2.0.2

- Fixed distance text appearing underneath tokens. (fixes issue #4)

## v2.0.1

- Improved compatibility with [Health Estimate](https://github.com/mclemente/healthEstimate) in the top position.

## v2.0.0

### Feature

- Players no longer need to select their token before measuring distance. Distance is automatic if the user has a player character configured and there is exactly one on the current scene.

### Technical Notes

- Full rewrite to avoid continually recreating and destroying PIXI text containers. Hopefully leading to slight performance improvements.
- Switched to using Foundry's PreciseText class to improve presentation of range text.
- Improved compatibility with [Health Estimate](https://github.com/mclemente/healthEstimate).
  - Instant range accounts for the Health Estimate's position and font size to position itself accordingly.
- Improved notifications for failed wrapper initialization and possible conflicting modules.

## v1.0.1

- Support for Spanish localization. Feedback on the translation is appreciated.
