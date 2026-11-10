# Go-Bananas

**Banana Battalion** is a playable browser arcade survival game built with Phaser 3, TypeScript, and Vite.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the Local URL printed by Vite. `npm test` runs the shared simulation checks; `npm run build` type-checks and creates a static production build in `dist/`.

## The Wild Update

Choose a difficulty before starting. Your choice and a separate best score for each difficulty are saved on this device. Old best scores are kept under Arcade.

| Difficulty | The fight | Score |
| --- | --- | --- |
| Chill | Smaller, slower packs, softer enemies, one starting shield and longer protection after a hit. | ×0.75 |
| Arcade | The balanced starting point. | ×1 |
| Wild | 40% more enemies, 25% more health, faster movement and spawns. | ×1.5 |
| Bananas | 90% more enemies, 55% more health, the fastest packs and spawns. | ×2 |

**Build your squad:** every third cleared wave (3, 6, 9, 12 and 15), pick one of three random upgrades. The whole fight freezes while you choose. Upgrade damage, fire rate, dash recharge, bomb size or pickup reach for the rest of the run, or choose Monkey Care to restore a heart and a shield to living teammates. Upgrades reset on a fresh run. Tap a card, use 1–3, navigate with arrows/Tab and Enter/Space, or use a controller's left/right and A.

**Read the pack:** mint-scarfed Stalkers flank instead of chasing in a line. Purple Hunters enter from wave 4, keep their distance and telegraph a three-shot pink volley. Their aim locks during the warning, so move sideways, dash or hide behind a crate. Bosses add an eight-shot ring during their charge below half health, marked by a red aura and the Fury Phase label.

**Earn Banana Rush:** get 12 kills without taking unprotected damage for up to six seconds of rapid fire, with a gold meter and arena glow. It ends when the wave clears. Reduced effects removes the ambient motes and frame glow.

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
- **Aim & fire is the default:** push the **right stick** to aim and keep shooting in that direction. Release it (or return to the centre) to stop. A golden aim guide shows where your shots go.
- Gentle aim assistance nudges up to six degrees toward visible enemies within an 18-degree cone and 640 arena units. It never turns you toward enemies behind you; tracking and leading still matter.
- Choose **Auto · Just move** in **Phone controls** before a run, or enable **Auto mode** in Settings, for automatic shooting and nearest-enemy targeting. You can still override the aim with the right stick. The choice is saved on this device. Older saved settings default to Aim & fire.
- **Bomb**, **Dash**, and **Revive** sit beside the left movement stick. Tap them with your movement thumb while keeping the right thumb on aim; bombs follow that aim.
- Portrait keeps the controls below the arena. Landscape uses the screen for the game and puts the sticks at the sides. Rotation and cancelled touches clear held sticks; pause, game over, and losing focus stop shooting in both modes.

Each monkey starts with **three hearts**: **six unprotected jaguar hits** knock them out. Every hit immediately removes half a heart, shows a damage label, and grants 0.6 seconds (1 second on Chill) to escape without taking damage on every frame of the same contact. There are no automatic extra lives or wave heals. Health pickups restore one heart, up to three. Shields and the Timber Tank visibly protect against hits. Hearts stay visible above the arena and each monkey, plus in squad cards; the footer shows hits remaining or active protection. A solo knockout ends the run. In co-op, a nearby teammate can revive a monkey within 14 seconds.

## This build

- Original procedurally drawn arena and character sprites; no downloaded game art.
- Three weapon types, melon bombs, dash, health, shields, temporary wooden tank, score combos, and saved best score.
- Chasing, pouncing, flanking, ranged, heavy and boss jaguars, with visible attack warnings and boss fury phases.
- Six waves per chapter, three arena themes (jungle, lab, space), and a final victory at wave 18.
- Local multiplayer input, downed teammates and revives, six-hit solo survival.
- Pause, immediate replay, instructions, audio/music options, aim assist, and reduced effects.
- Synthesised sound effects and a simple musical loop. Fonts use Google Fonts with local fallback fonts.

The lab and space chapters currently reuse the core combat rules with different art, stronger enemies and named bosses. Their unique environmental hazards, the helicopter, more weapons, and online co-op are future work.

## Code map

- `src/simulation.ts`: browser-independent gameplay, seeded randomness, combat, pickups, waves and revives. Suitable for extraction into a server-owned simulation later.
- `src/scene.ts`: Phaser rendering, fixed simulation steps, input adapters and visual effects.
- `src/art.ts`: original canvas textures and character portraits.
- `src/audio.ts`: Web Audio sound effects and music.
- `src/touch-controls.ts`, `src/touch-state.ts`, and `src/touch-aim.ts`: independent movement/aiming pointers, deliberate firing, gentle assistance, optional Auto mode, action buttons and cancellation.
- `src/health.ts`: three-heart display and half-heart health units.
- `src/local-lobby.ts`: controller requirements and player/controller assignment.
- `src/main.ts`: lobby, HUD, settings, score storage and menus.
- `tests/simulation.test.ts`: meaningful simulation tests, including a four-player/100-enemy stress scenario.

Private publication uses the Sites manifest in `.openai/hosting.json`. The game itself is static and has no accounts, analytics or backend.

## Verification

Automated checks cover combat, actual six-hit jaguar contact, health pickups, revives, wave progression without passive healing, four-player crowds, player counts, controller assignment, independent touch pointers, aim-to-fire and release-to-stop, deadzones, gentle assistance boundaries and obstacles, optional automatic targeting, pause cancellation in both modes, and bombs while aiming.

Browser verification covers 390×844 portrait and 844×390 landscape layouts, held directional fire with the legacy aim-assist setting enabled, automatic fire without aiming in Auto mode, saved mode selection after reload, bombs, dash, pause and returning to the lobby. The Wild Update also checks phone difficulty selection, persistent choices, safe perk menus in both orientations, keyboard selection and resuming after upgrades. Local fixtures used for these browser scenarios are removed from the delivered code. No browser console errors were observed. Physical phones, simultaneous real touch gestures and controller mappings still need device testing. Online multiplayer is not included in this build.
