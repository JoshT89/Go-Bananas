import Phaser from 'phaser';
import './style.css';
import './mobile.css';
import { JungleScene } from './scene';
import { monkeyPortrait } from './art';
import { WIDTH, HEIGHT, WORLDS, PLAYER_NAMES, PLAYER_COLOURS, WEAPONS } from './simulation';
import type { Simulation } from './simulation';
import { heartFills, MAX_HEALTH } from './health';
import { localSquad } from './local-lobby';
import { TouchControls } from './touch-controls';

const paths: Record<string, string> = {
  banana: '<path d="M18 3c3 10-4 20-15 16-2-1-3-3-2-5 9 4 15-2 15-10Z"/><path d="m16 4 1-3 3 1-1 3"/>',
  play: '<path d="m8 5 11 7-11 7Z"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  sound: '<path d="m11 4-6 5H2v6h3l6 5Z"/><path d="M15 8q5 4 0 8m3-11q8 7 0 14"/>',
  muted: '<path d="m11 4-6 5H2v6h3l6 5Z"/><path d="m16 9 6 6m0-6-6 6"/>',
  settings: '<path d="m9 3 1-1h4l1 3 3 1 3-1 2 4-2 2v3l2 2-2 4-3-1-3 1-1 3h-4l-1-3-3-1-3 1-2-4 2-2v-3L1 9l2-4 3 1 3-1Z"/><circle cx="12" cy="12" r="3"/>',
  full: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3v2m-1 3h.01"/>',
  heart: '<path d="M12 21S1 14 1 7a6 6 0 0 1 11-3 6 6 0 0 1 11 3c0 7-11 14-11 14Z"/>',
  skull: '<path d="M5 16a9 9 0 1 1 14 0v5H5Z"/><circle cx="8" cy="11" r="2"/><circle cx="16" cy="11" r="2"/><path d="m12 14-1 3h2ZM9 18v3m6-3v3"/>',
  bolt: '<path d="m14 2-11 12h8l-1 8 11-13h-8Z"/>',
  bomb: '<circle cx="11" cy="14" r="8"/><path d="m16 7 2-4 3 1m-1-3 1 3 3-1M6 13q0-3 3-4"/>',
  pad: '<path d="M7 6h10c4 0 6 12 4 14-2 1-5-4-6-4H9c-1 0-4 5-6 4-2-2 0-14 4-14Z"/><path d="M7 9v6m-3-3h6m7-2h.01m2 3h.01"/>',
  pause: '<path d="M7 5v14M17 5v14"/>',
  trophy: '<path d="M7 3h10v8a5 5 0 0 1-10 0ZM7 5H2v3q0 5 5 5m10-8h5v3q0 5-5 5m-5 3v5m-5 0h10"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  leaf: '<path d="M21 3C6 0 0 9 7 17S25 16 21 3ZM4 21 17 8"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>',
};
const icon = (name: string, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.leaf}</svg>`;
const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
let selected = [0], connected: number[] = [], requestedPlayers = 1, started = false, bannerTimer: ReturnType<typeof setTimeout>;
type Settings = { sound: boolean; music: boolean; shake: boolean; reduced: boolean; assist: boolean; touch: boolean };
const settings: Settings = { sound: true, music: true, shake: true, reduced: false, assist: false, touch: matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0 };
let best = 0;
try { best = Number(localStorage.getItem('bb-best') ?? 0); Object.assign(settings, JSON.parse(localStorage.getItem('bb-settings') ?? '{}')); } catch { /* Storage can be unavailable in private browsing. */ }
const saveSettings = () => { try { localStorage.setItem('bb-settings', JSON.stringify(settings)); } catch { /* Optional persistence. */ } };

$('#app').innerHTML = `
  <div class="site-shell">
    <header class="site-header">
      <a class="brand" href="/" aria-label="Banana Battalion home"><span class="brand-mark">${icon('banana')}</span><span>BANANA<span class="brand-second">BATTALION<span class="brand-dot">®</span></span></span></a>
      <div class="header-tag"><span class="tiny-dot"></span> SMALL SQUAD. BIG FRUIT ENERGY.</div>
      <nav class="header-actions" aria-label="Game options"><button class="text-button" id="how">${icon('help')} HOW TO PLAY</button><span class="nav-divider"></span><button class="icon-button" id="sound" aria-label="Mute audio">${icon('sound')}</button><button class="icon-button" id="settings" aria-label="Game settings">${icon('settings')}</button></nav>
    </header>
    <main>
      <div class="page-heading"><div><div class="eyebrow">THE ARCADE IS OPEN <span> / </span> EST. FIVE MINUTES AGO</div><h1>WELCOME TO THE FOOD FIGHT<span>.</span></h1></div><div class="co-op-tag">${icon('pad')} 1–4 PLAYER CO-OP <span>LOCAL</span></div></div>
      <div class="game-layout">
        <section class="play-column" aria-label="Banana Battalion arcade">
          <div class="game-frame" id="game-frame">
            <div class="game-topbar"><div class="location"><span class="live-dot"></span><span id="location-name">JUNGLE JAM</span><span class="location-sub"> / SURVIVAL</span></div><div class="topbar-right"><span id="run-time">00:00</span><button class="game-icon" id="pause" aria-label="Pause game" disabled>${icon('pause')}</button><button class="game-icon" id="fullscreen" aria-label="Toggle fullscreen">${icon('full')}</button></div></div>
            <div class="canvas-wrap" id="canvas-wrap">
              <div id="game" aria-label="Top-down monkey survival game. Use WASD to move, mouse to aim, left click to fire, Q for bombs, and Space to dash."></div>
              <div class="in-game-hud hidden" id="in-game-hud"><div class="wave-pill"><span>WAVE</span><strong id="wave">01</strong><div class="wave-divider"></div><div><b id="enemies">14</b><small>JAGUARS LEFT</small></div></div><div class="score-pill">${icon('banana')}<strong id="score">000000</strong><span id="combo"></span></div></div>
              <div class="wave-banner" id="wave-banner" aria-live="polite"></div>
              <div id="intermission" class="intermission hidden"></div>
              <div class="lobby" id="lobby">
                <div class="lobby-copy"><div class="ribbon">${icon('leaf')} WELCOME TO THE JUNGLE</div><h2>GO<br><span>BANANAS.</span></h2><p>Four monkeys. Too many jaguars.<br>Good thing you brought the fruit.</p><button class="start-button" id="start">LET’S GO BANANAS ${icon('arrow')}</button><div class="start-note"><span class="tiny-dot"></span><span id="squad-note">SOLO RUN · NO MONKEY LEFT BEHIND</span></div></div>
                <div class="lobby-art" aria-hidden="true"><div class="mascot-halo"></div><div class="mascot-sparks">✦<span>✧</span><b>✦</b></div><div class="mascot">${monkeyPortrait()}</div><div class="fruit-sticker">100%<br><span>ORGANIC<br>FIREPOWER</span></div><div class="mascot-tag">MANGO <span>CHIEF BANANA OFFICER</span></div></div>
                <div class="lobby-bottom"><span>${icon('target')} AIM SMALL. PEEL BIG.</span><button id="input-mode">${icon('pad')} KEYBOARD + CONTROLLERS ${icon('arrow')}</button></div>
              </div>
              <div class="game-overlay hidden" id="pause-overlay"><div class="overlay-panel"><div class="eyebrow">TAKE A BREATHER</div><h2>ON A<br><span>BANANA BREAK.</span></h2><p>The jaguars can wait.</p><button class="start-button" id="resume">BACK TO THE JUNGLE ${icon('play')}</button><button class="subtle-button" id="restart-paused">START A FRESH RUN</button></div></div>
              <div class="game-overlay hidden" id="end-overlay"><div class="overlay-panel end-panel"><div class="eyebrow" id="end-eyebrow">A NOBLE FOOD FIGHT</div><h2 id="end-title">THAT WAS<br><span>BANANAS.</span></h2><p id="end-subtitle">Every great monkey gets another shot.</p><div class="end-stats" id="end-stats"></div><button class="start-button" id="retry">ONE MORE RUN ${icon('arrow')}</button><button class="subtle-button" id="back-lobby">BACK TO BASE CAMP</button></div></div>
              <div class="loading" id="loading"><span class="loading-spinner"></span>PACKING THE BANANAS…</div>
            </div>
            <div class="game-bottom-bar"><span>${icon('bolt')} <b id="game-status">YOUR JUNGLE. YOUR RULES. THEIR PROBLEM.</b></span><span id="continue-count">2 SECOND CHANCES</span></div>
          </div>
          <div class="squad-heading"><span>THE BANANA BUNCH <b id="squad-count">01 / 04</b></span><span>CONNECT CONTROLLERS TO BRING THE CREW ${icon('pad')}</span></div>
          <div class="squad" id="squad">${[0, 1, 2, 3].map(id => `<button class="player-card ${id === 0 ? 'joined' : 'empty'}" data-player="${id}" ${id === 0 ? 'disabled' : ''} style="--player:${PLAYER_COLOURS[id]}"><div class="player-portrait">${monkeyPortrait(PLAYER_COLOURS[id])}</div><div class="player-copy"><span class="player-number">PLAYER 0${id + 1}</span><strong>${id === 0 ? PLAYER_NAMES[id] : 'BRING A FRIEND'}</strong><div class="player-detail">${id === 0 ? '● READY FOR ACTION' : '+ CONNECT CONTROLLER'}</div></div><div class="player-hearts"></div></button>`).join('')}</div>
          <div class="controls-strip"><span><kbd>W</kbd><span class="wasd"><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span> MOVE</span><span>${icon('target')} MOUSE AIM + FIRE</span><span><kbd>Q</kbd> MELON BOMB</span><span><kbd>SPACE</kbd> DASH</span><button id="controls-more">ALL CONTROLS ${icon('arrow')}</button></div>
        </section>
        <aside class="sidebar">
          <section class="mission-card"><div class="card-label">YOUR NEXT BAD IDEA <span>01</span></div><div class="mission-art"><svg viewBox="0 0 260 130" aria-hidden="true"><path d="M-20 110Q25 30 80 85T180 48T280 70M-20 80Q40 0 100 65T230 15T290 60M-20 140Q50 65 120 110T280 95M-20 45Q50-25 120 30T280 15" fill="none" stroke="#ffffff13" stroke-width="1"/><path d="M-20 122Q70 75 115 95t70-58 95-20" fill="none" stroke="#e5d3a85c" stroke-width="2" stroke-dasharray="4 5"/><circle cx="143" cy="78" r="19" fill="#e9bb5e22" stroke="#f4c86c"/><circle cx="143" cy="78" r="6" fill="#f4c86c"/><path d="m143 48-4 9h8Z" fill="#f4c86c"/><path d="m214 107 9-25 9 25m-14-10h10m-174-62 10-24 10 24m-14-9h10" stroke="#8ca86a" stroke-width="3" fill="none"/></svg><span>FIELD GUIDE / <b id="chapter">01</b></span></div><div class="mission-body"><div class="eyebrow">CHAPTER <span id="chapter-number">01</span></div><h2 id="world-title">JUNGLE JAM</h2><p id="world-sub">Somewhere deep in the wrong jungle.</p><div class="chapter-progress" id="chapter-progress">${Array.from({ length: 6 }, (_, i) => `<i class="${i === 0 ? 'current' : ''}"></i>`).join('')}</div><div class="mission-objective">${icon('skull')}<span id="mission-objective">SURVIVE 6 WAVES. MEET KING CLAW.</span></div></div></section>
          <section class="armory-card"><div class="card-label">THE FRUIT AISLE <span>${icon('bolt')}</span></div><div class="weapon-list"><button class="weapon selected" data-weapon="banana"><span class="weapon-art banana-art">${icon('banana')}</span><span><b>BANANA BLASTER</b><small>THE TRUSTY CLASSIC</small></span><span class="weapon-code">01</span></button><button class="weapon" data-weapon="nuts"><span class="weapon-art nuts-art"><i></i><i></i><i></i></span><span><b>NUTCRACKER</b><small>A LITTLE NUTS. A LOT OF DAMAGE.</small></span><span class="weapon-code">02</span></button><button class="weapon" data-weapon="coconut"><span class="weapon-art coconut-art"><i></i></span><span><b>COCONUT CANNON</b><small>FOR BIGGER PROBLEMS.</small></span><span class="weapon-code">03</span></button></div><p id="weapon-description">Hold fire for a steady stream of bananas. Unlimited fruit. Questionable accuracy.</p><div class="armory-note">FIND GLOWING PICKUPS IN THE ARENA ${icon('arrow')}</div></section>
          <section class="best-card">${icon('trophy')}<div><span>YOUR PERSONAL BEST</span><strong id="best">${String(best).padStart(6, '0')}</strong></div><span class="best-star">✦</span></section>
          <div class="dispatch"><span>DISPATCH FROM BASE CAMP</span><p id="tip">“If life gives you bananas,<br>build a machine gun.”</p><div>— MANGO, PROBABLY</div></div>
        </aside>
      </div>
      <footer><span><i class="tiny-dot"></i> FRESH FRUIT. FRESH CHAOS.</span><span>NO MONKEY LEFT BEHIND. <span class="footer-banana">${icon('banana')}</span></span><span>FIELD TEST 001 <b>© BANANA BATTALION</b></span></footer>
    </main>
  </div>
  <dialog id="controls-dialog"><button class="dialog-close" aria-label="Close controls">${icon('close')}</button><div class="eyebrow">QUICK FIELD TRAINING</div><h2>LEARN THE<br><span>PEEL OF BATTLE.</span></h2><p>Move and aim independently. Hold fire, keep moving, and don’t let the pack surround you.</p><div class="control-table"><div><b>MOVE</b><span>WASD / Left stick</span></div><div><b>AIM + FIRE</b><span>Mouse + left click / Right stick + RT</span></div><div><b>MELON BOMB</b><span>Q or right click / LT</span></div><div><b>DASH</b><span>Space / RB or A</span></div><div><b>REVIVE A FRIEND</b><span>Hold E nearby / Hold X</span></div><div><b>PAUSE</b><span>Esc or P / Pause button above arena</span></div></div><p class="dialog-tip">Special fruit weapons last 18 seconds. The Timber Tank lasts 12. Glowing circles mean pickups; jaguar warning lines mean get out of the way.</p><p class="dialog-tip">For couch co-op, connect controllers, add players in the squad cards, then start. Choose “Controllers only” for a full controller squad. Online rooms are planned for a later build.</p><button class="start-button dialog-done">GOT IT. LET’S GO. ${icon('arrow')}</button></dialog>
  <dialog id="settings-dialog"><button class="dialog-close" aria-label="Close settings">${icon('close')}</button><div class="eyebrow">TUNE YOUR JUNGLE</div><h2>YOUR KIND<br><span>OF CHAOS.</span></h2><p>Less shaking? More banana music? You’re in charge.</p><div class="settings-list">${([['sound', 'SOUND EFFECTS', 'Fruit with a little more crunch.'], ['music', 'JUNGLE GROOVE', 'A little rhythm for the food fight.'], ['shake', 'SCREEN SHAKE', 'Give those melon bombs some weight.'], ['reduced', 'GENTLE EFFECTS', 'Reduce flashes and explosion particles.'], ['assist', 'AIM ASSIST', 'Aim at the nearest jaguar. Hold fire or J to shoot.']] as const).map(([key, title, text]) => `<label><span><b>${title}</b><small>${text}</small></span><input type="checkbox" name="${key}" ${settings[key] ? 'checked' : ''}><span class="toggle"></span></label>`).join('')}</div><button class="start-button dialog-done">ALL SET ${icon('arrow')}</button></dialog>
`;

$('#game-frame').insertAdjacentHTML('beforebegin', `
  <section class="play-setup" aria-label="Choose player count">
    <div class="mode-picker"><span>HOW MANY MONKEYS?</span><div role="group" aria-label="Game mode"><button id="solo-mode" class="chosen" aria-pressed="true">${icon('banana')} SOLO <b>1 PLAYER</b></button><button id="coop-mode" aria-pressed="false">${icon('pad')} LOCAL CO-OP <b>2–4 PLAYERS</b></button></div></div>
    <div id="coop-setup" class="coop-setup hidden"><div class="player-count-picker" role="group" aria-label="Number of local players">${[2, 3, 4].map(count => `<button data-count="${count}" aria-pressed="false">${count} PLAYERS</button>`).join('')}</div><label class="host-control-label">PLAYER 1 USES <select id="host-control"><option value="mixed">Keyboard / touch</option><option value="controllers">A controller</option></select></label></div>
    <p id="join-help" role="status">One monkey. All the fruit. Ready when you are.</p>
  </section>`);
$('.game-topbar').insertAdjacentHTML('afterend', '<div class="run-health" id="run-health" aria-label="Squad health"></div>');
$('#canvas-wrap').insertAdjacentHTML('afterend', `
  <div class="touch-controls hidden inactive" id="touch-controls" aria-label="Touch game controls">
    <div class="stick-group"><button class="touch-stick move-stick" data-stick="move" aria-label="Move monkey: drag the left stick" disabled><span class="stick-cross"></span><span class="stick-nub">${icon('arrow')}</span></button><span>MOVE</span></div>
    <div class="touch-actions"><button data-action="bomb" aria-label="Throw melon bomb" disabled>${icon('bomb')}<span>BOMB <b id="touch-bombs">3</b></span></button><button data-action="dash" aria-label="Dash" disabled>${icon('bolt')}<span id="touch-dash">DASH</span></button><button data-action="revive" aria-label="Hold to revive a nearby monkey" disabled>${icon('heart')}<span>REVIVE</span></button></div>
    <div class="stick-group"><button class="touch-stick aim-stick" data-stick="aim" aria-label="Aim and fire: hold to shoot, drag to aim" disabled><span class="stick-cross"></span><span class="stick-nub">${icon('target')}</span></button><span>AIM + FIRE</span></div>
    <p>Left thumb moves · Right thumb shoots · Drag right to aim</p>
  </div>`);
$('#pause-overlay .overlay-panel').insertAdjacentHTML('beforeend', '<button class="subtle-button" id="pause-to-lobby">CHANGE PLAYERS / BASE CAMP</button>');
$('.settings-list').insertAdjacentHTML('beforeend', `<label><span><b>TOUCH CONTROLS</b><small>Left thumb to move. Right thumb to aim and fire.</small></span><input type="checkbox" name="touch" ${settings.touch ? 'checked' : ''}><span class="toggle"></span></label>`);
$('#controls-dialog .control-table').insertAdjacentHTML('afterbegin', '<div><b>PHONE / TABLET</b><span>Left stick moves · Right stick shoots</span></div>');
$('#controls-dialog .dialog-tip').insertAdjacentHTML('beforebegin', '<p class="dialog-tip">You have 3 hearts. Each jaguar hit costs half a heart. Your health is always above the arena and over your monkey. On a phone, hold the right stick to auto-aim, or drag it to aim manually. Use the BOMB and DASH buttons between the sticks.</p>');
$('#controls-dialog .dialog-tip:last-of-type').textContent = 'Choose Solo for one monkey, or Local co-op and 2, 3, or 4 players before starting. Friends on the same screen need a controller each; press any button so the browser detects them. Choose “A controller” for Player 1 if everyone is using controllers. You can change players from the pause menu. Online friend invites are not included yet.';
const touchControls = new TouchControls($('#touch-controls'));
let healthKey = '';
function healthIcons(hp: number) {
  return heartFills(hp).map(fill => `<span class="health-heart" aria-hidden="true">${icon('heart')}<span class="heart-fill" style="width:${fill * 100}%">${icon('heart')}</span></span>`).join('');
}
function renderHealth(players: { id: number; hp: number; alive: boolean }[]) {
  const key = players.map(p => `${p.id}:${p.hp}:${p.alive}`).join('|');
  if (key === healthKey) return; healthKey = key;
  $('#run-health').innerHTML = players.map(p => `<div class="monkey-health ${p.hp <= 2 ? 'low-health' : ''}" style="--player:${PLAYER_COLOURS[p.id]}" role="group" aria-label="${PLAYER_NAMES[p.id]} health: ${p.alive ? p.hp / 2 : 0} of 3 hearts"><b>P${p.id + 1}<span>${PLAYER_NAMES[p.id]}</span></b><span class="health-icons">${healthIcons(p.alive ? p.hp : 0)}</span><strong>${p.alive ? p.hp / 2 : 0}<small>/3</small></strong></div>`).join('') + (players.length === 1 ? '<span class="health-explainer">1 JAGUAR HIT = ½ HEART</span>' : '');
}

const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
function updateSquad() {
  const squad = localSquad(requestedPlayers, connected.length, scene.controllerOnly ? 'controllers' : 'mixed');
  selected = squad.ids;
  $('[id="squad-count"]').textContent = `${String(selected.length).padStart(2, '0')} / 04`;
  $('#squad-note').textContent = squad.canStart ? `${selected.length === 1 ? 'SOLO RUN' : `${selected.length}-MONKEY LOCAL SQUAD`} · READY TO PLAY` : `CONNECT ${squad.missingControllers} MORE CONTROLLER${squad.missingControllers === 1 ? '' : 'S'} TO START`;
  $('#solo-mode').classList.toggle('chosen', requestedPlayers === 1); $('#solo-mode').setAttribute('aria-pressed', String(requestedPlayers === 1));
  $('#coop-mode').classList.toggle('chosen', requestedPlayers > 1); $('#coop-mode').setAttribute('aria-pressed', String(requestedPlayers > 1));
  $('#coop-setup').classList.toggle('hidden', requestedPlayers === 1);
  document.querySelectorAll<HTMLButtonElement>('[data-count]').forEach(button => { button.classList.toggle('chosen', Number(button.dataset.count) === requestedPlayers); button.setAttribute('aria-pressed', String(Number(button.dataset.count) === requestedPlayers)); });
  $('#join-help').textContent = requestedPlayers === 1 ? scene.controllerOnly && !squad.canStart ? 'Connect a controller and press any button, or switch back to keyboard / touch below the start button.' : 'Solo: use keyboard + mouse, touch controls, or choose a controller below.' : squad.canStart ? `${requestedPlayers} local players ready on this screen. Each friend has their own controller. Online invites are not available yet.` : `Local co-op is on one screen. Connect ${squad.requiredControllers} controller${squad.requiredControllers === 1 ? '' : 's'}${scene.controllerOnly ? '' : ' for your friends'} and press a button on each. ${connected.length} detected; ${squad.missingControllers} more needed. Online invites are not available yet.`;
  $('#join-help').classList.toggle('needs-controllers', !squad.canStart);
  for (let id = 0; id < 4; id++) {
    const card = $<HTMLButtonElement>(`[data-player="${id}"]`), joined = selected.includes(id);
    const padIndex = scene.controllerOnly ? id : id - 1;
    const ready = (!scene.controllerOnly && id === 0) || connected[padIndex] !== undefined;
    card.classList.toggle('joined', joined && ready); card.classList.toggle('empty', !joined || !ready); if (!started) { card.classList.remove('down'); card.querySelector('.player-number')!.textContent = `PLAYER 0${id + 1}`; } card.disabled = started || id === 0;
    card.querySelector('strong')!.textContent = joined ? PLAYER_NAMES[id] : `ADD ${PLAYER_NAMES[id]}`;
    card.querySelector('.player-detail')!.textContent = joined ? ready ? (scene.controllerOnly || id > 0 ? '● CONTROLLER READY' : settings.touch ? '● TOUCH CONTROLS READY' : '● KEYBOARD + MOUSE') : 'PRESS A CONTROLLER BUTTON' : '+ CHOOSE LOCAL CO-OP';
  }
  $<HTMLButtonElement>('#start').disabled = !squad.canStart;
  $('#input-mode').innerHTML = `${icon('pad')} ${scene.controllerOnly ? 'ALL CONTROLLERS' : settings.touch ? 'TOUCH + CONTROLLERS' : 'KEYBOARD + CONTROLLERS'} ${icon('arrow')}`;
  if (!started) renderHealth(selected.map(id => ({ id, hp: MAX_HEALTH, alive: true })));
}
function applySettings() {
  scene.audio.setEnabled(settings.sound); scene.audio.music = settings.music && !scene.paused;
  scene.shake = settings.shake && !settings.reduced; scene.reduced = settings.reduced; scene.assist = settings.assist;
  touchControls.setEnabled(settings.touch); document.documentElement.classList.toggle('touch-mode', settings.touch);
  $('#sound').innerHTML = icon(settings.sound ? 'sound' : 'muted'); $('#sound').setAttribute('aria-label', settings.sound ? 'Mute audio' : 'Unmute audio');
  for (const key of Object.keys(settings) as (keyof Settings)[]) $<HTMLInputElement>(`[name="${key}"]`).checked = settings[key];
}
function showBanner(text: string) { clearTimeout(bannerTimer); const el = $('#wave-banner'); el.textContent = text; el.classList.add('show'); bannerTimer = setTimeout(() => el.classList.remove('show'), 2300); }
function hud(sim: Simulation) {
  if (!started) return;
  renderHealth(sim.players);
  touchControls.setPlaying(!scene.paused && (sim.mode === 'playing' || sim.mode === 'break'));
  $('#wave').textContent = String(sim.wave).padStart(2, '0'); $('#score').textContent = String(sim.score).padStart(6, '0');
  $('#enemies').textContent = String(sim.enemies.length + sim.toSpawn); $('#run-time').textContent = formatTime(sim.time);
  $('#combo').textContent = sim.combo >= 3 ? `${sim.combo} COMBO ×${Math.min(5, 1 + Math.floor(sim.combo / 10))}` : '';
  $('#continue-count').textContent = `${sim.continues} SECOND CHANCE${sim.continues === 1 ? '' : 'S'}`;
  const world = WORLDS[sim.world]; $('#world-title').textContent = world.name; $('#world-sub').textContent = world.sub; $('#location-name').textContent = world.name;
  $('#chapter').textContent = $('#chapter-number').textContent = String(sim.world + 1).padStart(2, '0');
  const localWave = (sim.wave - 1) % 6;
  $('#chapter-progress').innerHTML = Array.from({ length: 6 }, (_, i) => `<i class="${i < localWave ? 'complete' : i === localWave ? 'current' : ''}"></i>`).join('');
  $('#mission-objective').textContent = sim.world === 0 ? 'SURVIVE 6 WAVES. MEET KING CLAW.' : sim.world === 1 ? 'OUTSMART PROFESSOR PURR.' : 'DEFEAT ADMIRAL CLAW. SAVE THE FRUIT.';
  const boss = sim.enemies.find(e => e.kind === 'boss');
  $('#intermission').classList.toggle('hidden', sim.mode !== 'break' && !boss);
  if (sim.mode === 'break') $('#intermission').innerHTML = `${sim.wave % 6 === 0 ? `NEXT STOP: ${WORLDS[Math.min(2, sim.world + 1)].name}` : 'GRAB THE FRUIT. CATCH YOUR BREATH.'}<b>NEXT WAVE IN ${Math.ceil(sim.breakTime)}</b>`;
  else if (boss) $('#intermission').innerHTML = `<span>${sim.world === 0 ? 'KING CLAW' : sim.world === 1 ? 'PROFESSOR PURR' : 'ADMIRAL CLAW'}</span><div class="boss-track"><i style="width:${Math.max(0, boss.hp / boss.maxHp * 100)}%"></i></div>`;
  for (const p of sim.players) {
    const card = $<HTMLButtonElement>(`[data-player="${p.id}"]`);
    card.querySelector('.player-detail')!.innerHTML = p.alive ? `<span class="health-icons">${healthIcons(p.hp)}</span>` : p.downTime > 0 ? `DOWN · ${Math.ceil(p.downTime)}s TO REVIVE` : 'WAITING FOR NEXT WAVE';
    card.querySelector('strong')!.textContent = PLAYER_NAMES[p.id];
    card.classList.toggle('down', !p.alive);
    card.querySelector('.player-number')!.textContent = p.vehicleTime > 0 ? `TANK · ${Math.ceil(p.vehicleTime)}s` : `${WEAPONS[p.weapon].name}${p.weaponTime > 0 ? ` · ${Math.ceil(p.weaponTime)}s` : ''}`;
  }
  const p = sim.players.find(p => p.id === 0)!;
  $('#touch-bombs').textContent = String(p.bombs); $('#touch-dash').textContent = p.dashCd > 0 ? `${p.dashCd.toFixed(1)}s` : 'DASH';
  $('#game-status').innerHTML = `${p.vehicleTime > 0 ? `TIMBER TANK · ${Math.ceil(p.vehicleTime)}s` : WEAPONS[p.weapon].name} <span class="status-divider">/</span> ${p.bombs} MELON BOMBS <span class="status-divider">/</span> DASH ${p.dashCd > 0 ? `${p.dashCd.toFixed(1)}s` : 'READY'}`;
}
function start() {
  if (!localSquad(requestedPlayers, connected.length, scene.controllerOnly ? 'controllers' : 'mixed').canStart) return;
  started = true; $('#lobby').classList.add('hidden'); $('#end-overlay').classList.add('hidden'); $('#pause-overlay').classList.add('hidden');
  $('#in-game-hud').classList.remove('hidden'); $('#game-frame').classList.add('running'); $<HTMLButtonElement>('#pause').disabled = false;
  scene.start(selected); applySettings(); updateSquad();
  touchControls.setPlaying(true); $('.play-setup').classList.add('hidden');
  if (settings.touch) $('#game-frame').scrollIntoView({ block: 'start' });
  $('#pause').innerHTML = icon('pause'); $('#pause').setAttribute('aria-label', 'Pause game');
}
function pause(value: boolean) {
  if (!started || scene.sim.mode === 'over' || scene.sim.mode === 'won') return;
  scene.paused = value; scene.audio.music = settings.music && !value; $('#pause-overlay').classList.toggle('hidden', !value);
  touchControls.setPlaying(!value);
  $('#pause').innerHTML = icon(value ? 'play' : 'pause'); $('#pause').setAttribute('aria-label', value ? 'Resume game' : 'Pause game');
}
function ended(sim: Simulation) {
  scene.audio.music = false;
  touchControls.setPlaying(false);
  if (sim.score > best) { best = sim.score; try { localStorage.setItem('bb-best', String(best)); } catch { /* Optional persistence. */ } }
  $('#best').textContent = String(best).padStart(6, '0');
  $('#end-eyebrow').textContent = sim.mode === 'won' ? 'THE FRUIT IS SAFE. FOR NOW.' : sim.score === best && best > 0 ? 'A FRESH PERSONAL BEST' : 'A NOBLE FOOD FIGHT';
  $('#end-title').innerHTML = sim.mode === 'won' ? 'SQUAD GOALS.<br><span>JUNGLE LEGENDS.</span>' : 'THAT WAS<br><span>BANANAS.</span>';
  $('#end-subtitle').textContent = sim.mode === 'won' ? 'Three worlds. Eighteen waves. One legendary bunch.' : 'Every great monkey gets another shot.';
  $('#end-stats').innerHTML = `<div><span>TEAM SCORE</span><b>${String(sim.score).padStart(6, '0')}</b></div><div><span>WAVE</span><b>${String(sim.wave).padStart(2, '0')}</b></div><div><span>JAGUARS</span><b>${sim.kills}</b></div><div><span>BEST COMBO</span><b>${sim.bestCombo}</b></div>`;
  $('#end-overlay').classList.remove('hidden'); $<HTMLButtonElement>('#pause').disabled = true;
}
const scene = new JungleScene({ ready: () => { $('#loading').classList.add('hidden'); applySettings(); updateSquad(); }, hud, banner: showBanner, ended, pads: pads => {
  if (pads.join() === connected.join()) return; connected = pads; if (!started) updateSquad();
  else {
    const missing = selected.some(id => scene.controllerOnly ? id >= connected.length : id > 0 && id > connected.length);
    if (missing && !scene.paused) { pause(true); showBanner('CONTROLLER DISCONNECTED — RECONNECT TO CONTINUE'); }
  }
} });
scene.touch = touchControls;
new Phaser.Game({ type: Phaser.AUTO, parent: 'game', width: WIDTH, height: HEIGHT, backgroundColor: '#294430',
  scene: [scene], render: { antialias: true, roundPixels: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  fps: { target: 60, forceSetTimeOut: true },
  audio: { noAudio: true }, banner: false });

$('#start').addEventListener('click', start); $('#retry').addEventListener('click', start); $('#restart-paused').addEventListener('click', start);
$('#pause').addEventListener('click', () => pause(!scene.paused)); $('#resume').addEventListener('click', () => pause(false));
function backToLobby() {
  started = false; scene.prepareLobby(); $('#lobby').classList.remove('hidden'); $('#end-overlay').classList.add('hidden'); $('#in-game-hud').classList.add('hidden'); $('#game-frame').classList.remove('running'); $('#intermission').classList.add('hidden'); $<HTMLButtonElement>('#pause').disabled = true;
  $('#pause-overlay').classList.add('hidden'); $('.play-setup').classList.remove('hidden'); touchControls.setPlaying(false); touchControls.reset();
  $('#location-name').textContent = $('#world-title').textContent = WORLDS[0].name; $('#world-sub').textContent = WORLDS[0].sub;
  $('#run-time').textContent = '00:00'; $('#chapter').textContent = $('#chapter-number').textContent = '01';
  $('#chapter-progress').innerHTML = Array.from({ length: 6 }, (_, i) => `<i class="${i === 0 ? 'current' : ''}"></i>`).join('');
  $('#game-status').textContent = 'YOUR JUNGLE. YOUR RULES. THEIR PROBLEM.'; $('#continue-count').textContent = '2 SECOND CHANCES';
  updateSquad();
}
$('#back-lobby').addEventListener('click', backToLobby); $('#pause-to-lobby').addEventListener('click', backToLobby);
$('#sound').addEventListener('click', () => { settings.sound = !settings.sound; scene.audio.unlock(); applySettings(); saveSettings(); });
$('#input-mode').addEventListener('click', () => { scene.controllerOnly = !scene.controllerOnly; $<HTMLSelectElement>('#host-control').value = scene.controllerOnly ? 'controllers' : 'mixed'; updateSquad(); });
$('#solo-mode').addEventListener('click', () => { requestedPlayers = 1; scene.controllerOnly = false; $<HTMLSelectElement>('#host-control').value = 'mixed'; updateSquad(); });
$('#coop-mode').addEventListener('click', () => { requestedPlayers = Math.max(2, requestedPlayers); updateSquad(); });
document.querySelectorAll<HTMLButtonElement>('[data-count]').forEach(button => button.addEventListener('click', () => { requestedPlayers = Number(button.dataset.count); updateSquad(); }));
$('#host-control').addEventListener('change', () => { scene.controllerOnly = $<HTMLSelectElement>('#host-control').value === 'controllers'; updateSquad(); });
document.querySelectorAll<HTMLButtonElement>('[data-player]').forEach(card => card.addEventListener('click', () => { requestedPlayers = Number(card.dataset.player) + 1; updateSquad(); $('.play-setup').scrollIntoView({ block: 'center', behavior: 'smooth' }); }));
$('#fullscreen').addEventListener('click', async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('#game-frame').requestFullscreen(); } catch { showBanner('FULLSCREEN IS NOT AVAILABLE IN THIS BROWSER'); } });
let dialogPaused = false;
function openDialog(id: string) { dialogPaused = scene.paused; if (started) pause(true); $<HTMLDialogElement>(id).showModal(); }
$('#how').addEventListener('click', () => openDialog('#controls-dialog')); $('#controls-more').addEventListener('click', () => openDialog('#controls-dialog')); $('#settings').addEventListener('click', () => openDialog('#settings-dialog'));
document.querySelectorAll<HTMLDialogElement>('dialog').forEach(dialog => { dialog.querySelectorAll('button').forEach(button => button.addEventListener('click', () => dialog.close())); dialog.addEventListener('close', () => { if (started && !dialogPaused) pause(false); }); dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } }); });
document.querySelectorAll<HTMLInputElement>('.settings-list input').forEach(input => input.addEventListener('change', () => { settings[input.name as keyof Settings] = input.checked; applySettings(); if (!started) updateSquad(); saveSettings(); }));
window.addEventListener('keydown', event => { if (event.repeat || document.querySelector('dialog[open]')) return; if (event.code === 'Escape' || event.code === 'KeyP') { event.preventDefault(); pause(!scene.paused); } });
document.addEventListener('visibilitychange', () => { if (document.hidden && started) pause(true); });
const descriptions: Record<string, string> = { banana: 'Hold fire for a steady stream of bananas. Unlimited fruit. Questionable accuracy.', nuts: 'Six crunchy projectiles in a wide spread. Get close, crack nuts, clear the pack.', coconut: 'Slow, heavy coconuts explode on impact. Perfect for crowds and particularly large cats.' };
document.querySelectorAll<HTMLButtonElement>('[data-weapon]').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('.weapon').forEach(b => b.classList.remove('selected')); button.classList.add('selected'); $('#weapon-description').textContent = descriptions[button.dataset.weapon!]; }));
