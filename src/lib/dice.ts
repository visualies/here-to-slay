import { ServerDiceManager } from './server-dice';

export function createDiceManager(roomId: string, onUpdate?: () => void): ServerDiceManager {
  return new ServerDiceManager(roomId, onUpdate || (() => {}));
}

export function cleanupDiceManager(diceManager: ServerDiceManager | null): void {
  if (diceManager) {
    diceManager.disconnect();
  }
}