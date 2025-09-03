import { ActionParams, Player } from './types';

type ActionRegistry = {
  [key: string]: (params: ActionParams) => void;
};

const actionRegistry: ActionRegistry = {
  DRAW: ({ player, effect }: ActionParams) => {
    console.log(`${player.id} draws ${effect.amount} cards`);
    // In a real implementation, you would add cards to the player's hand
  },
  STEAL: ({ player, target, effect }: ActionParams) => {
    if (target) {
      console.log(`${player.id} steals ${effect.amount} ${effect.cardType} cards from ${target.id}`);
      // In a real implementation, you would move cards from target to player
    }
  },
  DESTROY: ({ player, target, effect }: ActionParams) => {
    if (target) {
      console.log(`${player.id} destroys ${effect.amount} ${effect.cardType} cards from ${target.id}`);
      // In a real implementation, you would remove cards from the target's party
    }
  },
};

export function executeEffect(params: ActionParams) {
  const action = actionRegistry[params.effect.action];
  if (action) {
    action(params);
  } else {
    console.error(`Action ${params.effect.action} not found in registry.`);
  }
}
