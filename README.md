# Banana Battalion

A playable browser arcade survival game built with Phaser 3, TypeScript, and Vite.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the Local URL printed by Vite. `npm test` runs the shared simulation checks; `npm run build` type-checks and creates a static production build in `dist/`.

## Controls

| Action | Keyboard / mouse | Controller |
| --- | --- | --- |
| Move | WASD | Left stick |
| Aim | Mouse | Right stick |
| Fire | Left click, or J | RT, or aim with right stick |
| Melon bomb | Q / right click | LT |
| Dash | Space | RB / A |
| Revive | Hold E near a downed friend | Hold X |
| Pause | Escape / P | Button above arena |

Aim assist is available in Settings. It aims at the nearest enemy while the player chooses when to fire.

For local co-op, connect controllers, click the available squad cards, and start. The default supports keyboard/mouse plus up to three controllers. Choose Controllers Only in the lobby for one to four controllers. Extra players join before the run. Friendly fire is disabled.

## This build

- Original procedurally drawn arena and character sprites; no downloaded game art.
- Three weapon types, melon bombs, dash, health, shields, temporary wooden tank, score combos, and saved best score.
- Chasing, pouncing, heavy and boss jaguars, with visible attack warnings.
- Six waves per chapter, three arena themes (jungle, lab, space), and a final victory at wave 18.
- Local multiplayer input, downed teammates and revives, solo second chances.
- Pause, immediate replay, instructions, audio/music options, aim assist, and reduced effects.
- Synthesised sound effects and a simple musical loop. Fonts use Google Fonts with local fallback fonts.

The lab and space chapters currently reuse the core combat rules with different art, stronger enemies and named bosses. Their unique environmental hazards, the helicopter, more weapons, and online co-op are future work.

## Code map

- `src/simulation.ts`: browser-independent gameplay, seeded randomness, combat, pickups, waves and revives. Suitable for extraction into a server-owned simulation later.
- `src/scene.ts`: Phaser rendering, fixed simulation steps, input adapters and visual effects.
- `src/art.ts`: original canvas textures and character portraits.
- `src/audio.ts`: Web Audio sound effects and music.
- `src/main.ts`: lobby, HUD, settings, score storage and menus.
- `tests/simulation.test.ts`: meaningful simulation tests, including a four-player/100-enemy stress scenario.

Private publication uses the Sites manifest in `.openai/hosting.json`. The game itself is static and has no accounts, analytics or backend.

## Verification

Automated simulation checks and production TypeScript/build checks pass. Browser checks cover starting, movement, shooting with aim assist, bomb use, dash, score updates, pause/resume, settings, instructions, and restart. Physical controller mappings require testing with connected hardware. Online multiplayer is not included in this build.
