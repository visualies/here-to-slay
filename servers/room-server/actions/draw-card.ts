import type { ActionContext, ActionResult, ActionParams, Card } from '../../../shared/types';
import { Location, Amount } from '../../../shared/types';
import { registerAction } from './action-registry';
import { getParam } from './action-utils';
import { addCardToPlayerHand } from '../../../src/lib/players';

export function run(context: ActionContext, params?: ActionParams): ActionResult {
  const { playersMap, gameStateMap, playerId } = context;

  // Get parameters
  const target = getParam<Location>(params, 'target');
  const destination = getParam<Location>(params, 'destination');
  const amount = getParam<Amount>(params, 'amount');

  console.log(`🎯 Internal: Moving ${amount} card(s) from ${target} to ${destination} for player ${playerId}`);

  // Handle different source locations
  let sourceCards: Card[] = [];
  let updateSourceFunction: (cards: Card[]) => void;

  switch (target) {
    case Location.SupportDeck:
      sourceCards = gameStateMap.get('supportStack') as Card[] || [];
      updateSourceFunction = (cards) => gameStateMap.set('supportStack', cards);
      break;
    case Location.OwnHand:
      const player = playersMap.get(playerId);
      sourceCards = player?.hand || [];
      updateSourceFunction = (cards) => {
        if (player) {
          playersMap.set(playerId, { ...player, hand: cards });
        }
      };
      break;
    default:
      return { success: false, message: `Unsupported source location: ${target}` };
  }

  // Check if source has enough cards
  const numAmount = typeof amount === 'number' ? amount : (amount === Amount.All ? sourceCards.length : 1);
  if (sourceCards.length < numAmount) {
    return { success: false, message: `Not enough cards in ${target} (has ${sourceCards.length}, needs ${numAmount})` };
  }

  // Draw cards from source
  const newSourceCards = [...sourceCards];
  const drawnCards: Card[] = [];

  for (let i = 0; i < numAmount; i++) {
    const card = newSourceCards.pop();
    if (card) {
      drawnCards.push(card);
    }
  }

  if (drawnCards.length === 0) {
    return { success: false, message: `Failed to draw cards from ${target}` };
  }

  // Update source
  updateSourceFunction(newSourceCards);

  // Handle different destination locations
  switch (destination) {
    case Location.OwnHand:
      // Add cards to player hand
      drawnCards.forEach(card => {
        addCardToPlayerHand(playersMap, playerId, card);
      });
      break;
    case Location.SupportDeck:
      // Add cards back to support stack
      const currentSupportStack = gameStateMap.get('supportStack') as Card[] || [];
      gameStateMap.set('supportStack', [...currentSupportStack, ...drawnCards]);
      break;
    default:
      return { success: false, message: `Unsupported destination location: ${destination}` };
  }

  const cardNames = drawnCards.map(card => card.name).join(', ');
  console.log(`✅ Internal: Moved card(s) ${cardNames} from ${target} to ${destination} for player ${playerId}`);

  return {
    success: true,
    message: `Moved ${drawnCards.length} card(s) from ${target} to ${destination}`,
    data: {
      cards: drawnCards,
      target,
      destination,
      amount: drawnCards.length
    }
  };
}

registerAction('drawCard', { run });