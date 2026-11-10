export const DIFFICULTIES = {
  chill: { name: 'CHILL', tag: 'Find your feet', description: 'Smaller packs. Slower cats. A little extra protection.', count: 0.7, health: 0.8, speed: 0.78, spawn: 1.25, score: 0.75, colour: '#a8dba3', stars: 1 },
  arcade: { name: 'ARCADE', tag: 'The original food fight', description: 'Balanced packs, new tricks and room to get good.', count: 1, health: 1, speed: 1, spawn: 1, score: 1, colour: '#f5cc76', stars: 2 },
  wild: { name: 'WILD', tag: 'Bring your best moves', description: 'Bigger packs, tougher cats and faster attacks.', count: 1.4, health: 1.25, speed: 1.12, spawn: 0.8, score: 1.5, colour: '#f8a778', stars: 3 },
  bananas: { name: 'BANANAS', tag: 'Certified monkey business', description: 'Double the pack. Relentless cats. Maximum chaos.', count: 1.9, health: 1.55, speed: 1.25, spawn: 0.65, score: 2, colour: '#ef98b4', stars: 4 },
} as const;
export type Difficulty = keyof typeof DIFFICULTIES;
export const UPGRADES = {
  power: { name: 'HEAVY FRUIT', detail: '+15% weapon damage', icon: 'banana', max: 3, colour: '#f6ca71' },
  rapid: { name: 'GOING NUTS', detail: '+12% fire rate', icon: 'bolt', max: 3, colour: '#f4ac77' },
  dash: { name: 'HAPPY FEET', detail: 'Dash recharges 15% faster', icon: 'arrow', max: 3, colour: '#96d5d0' },
  blast: { name: 'MELON MAYHEM', detail: '+18% melon blast size', icon: 'bomb', max: 3, colour: '#b4d98c' },
  magnet: { name: 'FRUIT MAGNET', detail: 'Collect pickups from farther away', icon: 'target', max: 3, colour: '#c2b0ec' },
  care: { name: 'MONKEY CARE', detail: 'Restore 1 heart + add 1 shield', icon: 'heart', max: Infinity, colour: '#f2aaa3' },
} as const;
export type Upgrade = keyof typeof UPGRADES;
export const freshUpgrades = (): Record<Upgrade, number> => ({ power: 0, rapid: 0, dash: 0, blast: 0, magnet: 0, care: 0 });
