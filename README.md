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
- **Shooting is automatic** during mobile play, even without touching either stick. Release the right stick to target the nearest jaguar, or drag it to aim manually.
- **Bomb**, **Dash**, and **Revive** sit beside the left movement stick. Tap them with your movement thumb while keeping the right thumb on aim; bombs follow that aim.
- Portrait keeps the controls below the arena. Landscape uses the screen for the game and puts the sticks at the sides. Rotation and cancelled touches clear held sticks; pause, game over, and losing focus stop automatic fire.

Each monkey starts with **three hearts**: **six unprotected jaguar hits** knock them out. Every hit immediately removes half a heart, shows a damage label, and grants 0.6 seconds to escape without taking damage on every frame of the same contact. There are no automatic extra lives or wave heals. Health pickups restore one heart, up to three. Shields and the Timber Tank visibly protect against hits. Hearts stay visible above the arena and each monkey, plus in squad cards; the footer shows hits remaining or active protection. A solo knockout ends the run. In co-op, a nearby teammate can revive a monkey within 14 seconds.

## This build

- Original procedurally drawn arena and character sprites; no downloaded game art.
- Three weapon types, melon bombs, dash, health, shields, temporary wooden tank, score combos, and saved best score.
- Chasing, pouncing, heavy and boss jaguars, with visible attack warnings.
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
- `src/touch-controls.ts` and `src/touch-state.ts`: independent movement/aiming pointers, thumb-stick deadzones, action buttons and cancellation.
- `src/health.ts`: three-heart display and half-heart health units.
- `src/local-lobby.ts`: controller requirements and player/controller assignment.
- `src/main.ts`: lobby, HUD, settings, score storage and menus.
- `tests/simulation.test.ts`: meaningful simulation tests, including a four-player/100-enemy stress scenario.

Private publication uses the Sites manifest in `.openai/hosting.json`. The game itself is static and has no accounts, analytics or backend.

## Verification

Automated checks cover combat, actual six-hit jaguar contact, health pickups, revives, wave progression without passive healing, four-player crowds, player counts, controller assignment, automatic fire without an aiming touch, independent touch pointers, pause cancellation, and bombs while aiming. Browser checks cover portrait/landscape phone sizes, starting, stick movement and firing, touch bombs and dash, health visibility, pause, changing players, settings, and restart. Physical phones and controller mappings still benefit from device testing. Online multiplayer is not included in this build.
