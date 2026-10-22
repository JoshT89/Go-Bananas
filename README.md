# Go-Bananas

**Banana Battalion** is a playable browser arcade survival game built with Phaser 3, TypeScript, and Vite.

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

Choose **Solo** to start with one monkey. Choose **Local co-op**, then **2, 3, or 4 players**, for friends on the same screen. The lobby shows how many controllers are required and how many are detected. Press a button on each connected controller to make it visible to the browser. The default supports keyboard/mouse or touch for Player 1, plus a controller for each friend. Choose **A controller** under Player 1 for a controller-only squad. The pause menu's **Change players / Base camp** button returns to setup. Extra players join before the run. Friendly fire is disabled. Online friend invites are not implemented yet.

## Phones and tablets

Touch controls turn on automatically on touch devices and can also be enabled in Settings.

- Drag the **left stick** to move.
- Hold the **right stick** to fire at the nearest jaguar, or drag it to aim manually.
- Use the **Bomb**, **Dash**, and **Revive** buttons between the sticks.
- Portrait keeps the controls below the arena. Landscape uses the screen for the game and puts the sticks at the sides. Rotation, pause, losing focus, and cancelled touches clear held controls to prevent drifting or stuck firing.

Each monkey starts with **three hearts**. One jaguar hit takes **half a heart**, with brief protection between hits. Hearts are always visible above the arena and over each monkey, plus in squad cards. Healing restores one heart, and clearing a wave restores half a heart, up to the three-heart maximum.

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
- `src/touch-controls.ts` and `src/touch-state.ts`: independent movement/aiming pointers, thumb-stick deadzones, action buttons and cancellation.
- `src/health.ts`: three-heart display and half-heart health units.
- `src/local-lobby.ts`: controller requirements and player/controller assignment.
- `src/main.ts`: lobby, HUD, settings, score storage and menus.
- `tests/simulation.test.ts`: meaningful simulation tests, including a four-player/100-enemy stress scenario.

Private publication uses the Sites manifest in `.openai/hosting.json`. The game itself is static and has no accounts, analytics or backend.

## Verification

Automated checks cover combat, three-heart damage/healing, revives, wave progression, four-player crowds, local player counts, controller assignment, two independent touch pointers, touch cancellation, and movement plus firing through the simulation. Browser checks cover portrait/landscape phone sizes, starting, stick movement and firing, touch bombs and dash, health visibility, pause, changing players, settings, and restart. Physical phones and controller mappings still benefit from device testing. Online multiplayer is not included in this build.
