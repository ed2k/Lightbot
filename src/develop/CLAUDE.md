# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LightBot is an educational programming puzzle game that teaches logical thinking. Players program a robot using visual instructions to navigate an isometric map and light up target tiles. The game features two implementations: a 2D Canvas version (`index.html`) and a 3D Three.js version (`new.html`).

## Running the Game

**Development server (from this directory):**
```bash
python -m http.server 8000
```
Then open `http://localhost:8000/index.html` (2D) or `http://localhost:8000/new.html` (3D).

**Level shortcuts:** Append `?level=N` to URL (e.g., `index.html?level=5`).

**Minification (Windows only):**
```batch
# From repository root
minify and deploy.bat
```
Uses Google Closure Compiler for JS and YUI Compressor for CSS. Output goes to `deploy/` folder.

## Architecture

The codebase follows an MVC pattern with all code under the `lightBot` global namespace.

### Module Structure (js/)

**Model Layer** - Game state and logic:
- `lightbot.model.game.js` - Bootstrap, defines `lightBot` namespace
- `lightbot.model.bot.js` - Robot state and movement logic
- `lightbot.model.bot.instructions.js` - Instruction types (Walk, Jump, Light, TurnLeft, TurnRight, Proc1, Proc2)
- `lightbot.model.map.js` - Level map structure
- `lightbot.model.map.state.js` - Tracks which lights are activated
- `lightbot.model.box.js` - Base tile type
- `lightbot.model.lightbox.js` - Light tile (goal tiles)
- `lightbot.model.elevatorbox.js` - Elevator mechanics
- `lightbot.model.directions.js` - Direction constants (0-3 for N/E/S/W)
- `lightbot.model.medals.js` - Medal thresholds (gold/silver/bronze)
- `lightbot.maps.data.js` - Level definitions as JSON

**View Layer** - Canvas 2D rendering:
- `lightbot.view.canvas.js` - Main canvas setup
- `lightbot.view.canvas.game.js` - Game loop
- `lightbot.view.canvas.bot.js` - Robot rendering
- `lightbot.view.canvas.box.js` - Tile rendering
- `lightbot.view.canvas.map.js` - Map rendering
- `lightbot.view.canvas.bot.animations.js` - Bot animation system
- `lightbot.view.canvas.projection.js` - Isometric projection math

**UI Layer** - User interaction:
- `lightbot.view.canvas.ui.js` - Main UI controller
- `lightbot.view.canvas.ui.buttons.js` - Instruction buttons
- `lightbot.view.canvas.ui.editor.js` - Drag-drop instruction editor (MAIN, PROC1, PROC2)
- `lightbot.view.canvas.ui.dialogs.js` - Modal dialogs
- `lightbot.view.canvas.ui.history.js` - URL history/level shortcuts

**Tools:**
- `lightbot.view.mapeditor.js` - Built-in level editor

### Level Data Format

Levels in `lightbot.maps.data.js` use this structure:
```javascript
{
  "direction": 0,              // Bot starting direction (0=N, 1=E, 2=S, 3=W)
  "position": {"x": 4, "y": 5}, // Bot starting position
  "map": [[{"h": 1, "t": "b"}, ...]],  // 2D array of tiles
  "medals": {"gold": 3, "silver": 4, "bronze": 5}  // Instruction count thresholds
}
```
Tile types: `"b"` = basic block, `"l"` = light (goal), `"e"` = elevator

### Instruction System

The game uses a three-level instruction system:
- **MAIN** - Primary instruction sequence
- **PROC1** - Reusable procedure 1 (called with `proc1` instruction)
- **PROC2** - Reusable procedure 2 (called with `proc2` instruction)

Instructions: `walk`, `jump`, `light`, `turnLeft`, `turnRight`, `proc1`, `proc2`

## Key Dependencies

- jQuery 1.7 and jQuery UI 1.8.16 (for drag-drop editor)
- Three.js (for 3D version in `new.html`)
- Google Closure Compiler annotations (`/*jsl:option explicit*/`, `/*jsl:import*/`)

## Game State Persistence

Game progress (level completion, medals, achievements) is stored in browser localStorage.
