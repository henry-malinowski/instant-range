## v2.0.2
Fixed distance text appearing underneath tokens. (fixes issue #4)

## v2.0.1
Improved compatibility with Health Estimate in the top position.

## v2.0.0
### Feature
* Players no longer need to select there token before measuring distance. Distance is automatic if the user has a player character configured and there is exactly one on the current scene. 

### Technical Notes
* Full rewrite to avoid continually recreating and destroying PIXI text containers. Hopefully leading to slight performance improvements.
* Switched to using Foundry's PreciseText class to improve presentation of range text.
* Improved compatibility with Health Estimate. 
    * Instant range accounts for the Health Estimate's position and font size to position itself accordingly.
* Improved notifications for failed wrapper initialization and possible conflicting modules.

## v1.0.1

Support for Spanish localization. Feed back on the translation is appreciated.