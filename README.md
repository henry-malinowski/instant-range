![](https://img.shields.io/endpoint?url=https%3A%2F%2Ffoundryshields.com%2Fversion%3Fstyle%3Dflat-square%26url%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fhenry-malinowski%2Finstant-range%2Frefs%2Fheads%2Fmain%2Fmodule.json)
![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Finstant-range&colorB=6c27ff&style=flat-square&logo=CurseForge&logoColor=white)
![GitHub Downloads (specific asset, all releases)](https://img.shields.io/github/downloads/henry-malinowski/instant-range/module.zip?style=flat-square)

# Instant Range

Highlights hovered tokens and _instantly_ see the distance from your controlled token to another.
This lets players and GMs quickly check if a token is in the near or far range of an attack or if a potential spell target is just out of range.

## Demo

https://github.com/user-attachments/assets/0f1f5eaf-60e8-4292-9ea1-afe3b575d6a2

## Features

- **Global setting aware** - follows your world settings for determining how to handle diagonals
- **Scene grid aware** - uses the grid scale for determining distance and units on a scene by scene basis
- **Height aware** - uses both diagonals and scene grid settings while determining distance away even when a tokens are elevated
- **System Agnostic** - just tells you the distance from a selected token to a hovered token, nothing more, nothing less
- **Integrates with Alt** - Just like holding down the alt key, highlights all tokens and shows there name, Instant Range will also show the range for you or your selected token to every other token.
- **Targetting Integration** - Targetted tokens show their distance away while targetted.

## Settings

- Enable/disable the module's use out of combat. (GM only)
- Refresh throttle (ms): limit how often all distance labels refresh during panning or moving the source token. Lower values feel smoother; higher values may help with measuring distance to all tokens in scenes with a high number of tokens (>50 tokens).

## Installation Instructions

To install and use the instant-range module for Foundry Virtual Tabletop, simply paste the following URL into the **Install Module** dialog on the Setup menu of the application.

`https://raw.githubusercontent.com/henry-malinowski/instant-range/main/module.json`

If you wish to manually install the module, you must clone or extract it into the `Data/modules/instant-range` folder. You may do this by cloning the repository or downloading a zip archive from the [Releases Page](https://github.com/henry-malinowski/instant-range/releases).
