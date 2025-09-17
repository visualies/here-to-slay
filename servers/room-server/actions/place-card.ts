import type { ActionContext, ActionResult, Player, Card } from '../../../shared/types';
import { Location, Amount, SelectionMode } from '../../../shared/types';
import { registerAction } from './action-registry';
import { moveCard } from '../lib/card-service';

export function run(context: ActionContext): ActionResult {
  const { playersMap, playerId, cardId } = context;
  
  // Get the player to check their hand
  const player = playersMap.get(playerId) as Player;
  if (!player) {
    return { success: false, message: 'Player not found' };
  }

  // cardId is required for place-card action
  if (!cardId) {
    console.log(`📍 Internal: No cardId provided for place-card action`);
    return { 
      success: false, 
      message: 'cardId is required for place-card action' 
    };
  }

  // Check if the specific card is in the player's hand
  const cardInHand = player.hand?.find(card => card.id === cardId);
  if (!cardInHand) {
    console.log(`📍 Internal: Card ${cardId} not found in player ${playerId}'s hand, nothing to place`);
    return {
      success: true,
      message: 'Card not found in hand, nothing to place',
      data: { playerId, cardId, cardsPlaced: 0 }
    };
  }

  // Check if the card is already in the party
  const isCardInParty = player.party.heroes.some(hero => 
    hero && hero.id === cardId
  ) || (player.party.leader && player.party.leader.id === cardId);

  if (isCardInParty) {
    console.log(`📍 Internal: Card ${cardId} is already in party, nothing to place`);
    return {
      success: true,
      message: 'Card is already in party, nothing to place',
      data: { playerId, cardId, cardsPlaced: 0 }
    };
  }

  // Place the specific card from hand to party
  console.log(`📍 Internal: Placing specific card ${cardId} from hand to party for player ${playerId}`);
  
  const target = Location.OwnHand;
  const destination = Location.OwnParty;
  const amount = Amount.One;
  const selection = SelectionMode.First; // Use first selection mode, specificCardId will override

  return moveCard(context, target, destination, amount, selection, cardId);
}

registerAction('placeCard', { run });