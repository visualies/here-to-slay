import { ServerDiceManager } from './server-dice';

export function createDiceManager(roomId: string): ServerDiceManager {
  return new ServerDiceManager(roomId, () => {});
}

export function cleanupDiceManager(diceManager: ServerDiceManager | null): void {
  if (diceManager) {
    diceManager.disconnect();
  }
}