export type LocalInputMode = 'mixed' | 'controllers';
export function localSquad(playerCount: number, controllerCount: number, mode: LocalInputMode) {
  const count = Math.max(1, Math.min(4, Math.floor(playerCount)));
  const requiredControllers = mode === 'controllers' ? count : count - 1;
  const missingControllers = Math.max(0, requiredControllers - controllerCount);
  return { count, ids: Array.from({ length: count }, (_, id) => id), requiredControllers, missingControllers, canStart: missingControllers === 0 };
}
export function controllerForPlayer(id: number, mode: LocalInputMode, padIds: number[]) {
  return mode === 'controllers' ? padIds[id] : id === 0 ? undefined : padIds[id - 1];
}
