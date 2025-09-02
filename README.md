![](https://img.shields.io/badge/Foundry-v13-informational)
![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/henry-malinowski/instant-range/total)
![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Finstant-range&colorB=4aa94a)

# Instant Range

Highlights hovered tokens and *instantly* see the distance from your controlled token to another.
This lets players and GMs quickly check if a token is in the near or far range of an attack or if a potential spell target is just out of range.

## Features

* Global setting aware - follows your world settings for determining how to handle diagonals
* Scene grid aware - uses the grid scale for determining distance and units on a scene by scene basis
* Height aware - uses both diagonals and scene grid settings while determining distance away even when a tokens are elevated
* System Agnostic - just tells you the distance from a selected token to a hovered token, nothing more, nothing less

## Example

https://github.com/user-attachments/assets/0f1f5eaf-60e8-4292-9ea1-afe3b575d6a2

## Settings

* Enable/disable the module's use out of combat.
* Disable the fast real-time updating when a token is moving. This may slightly implove performance, but profiling indicates that it makes no difference, so it's enabled by default.

## Installation Instructions

To install and use the instant-range module for Foundry Virtual Tabletop, simply paste the following URL into the **Install System** dialog on the Setup menu of the application.

`https://raw.githubusercontent.com/henry-malinowski/instant-range/master/module.json`

If you wish to manually install the module, you must clone or extract it into the `Data/modules/instant-range` folder. You may do this by cloning the repository or downloading a zip archive from the [Releases Page](https://github.com/henry-malinowski/instant-range/releases).
