import { CardType, HeroClass, Card } from '../types';

export const partyLeaderRegistry: Card[] = [
  {
    id: 'party-leader-001',
    name: 'The Fist of Reason',
    type: CardType.PartyLeader,
    heroClass: HeroClass.Fighter,
    description: 'Each time YOU roll to CHALLENGE, +2 to your roll.',
    requirements: [{ type: 'point', value: 0 }],
    effect: [{
      action: 'CHALLENGE_BOOST',
      amount: 2,
    }],
    imagePath: '/api/images/party-leaders/partyleader_figher.png',
  },
  {
    id: 'party-leader-002',
    name: 'The Charismatic Song',
    type: CardType.PartyLeader,
    heroClass: HeroClass.Bard,
    description: 'Each time you roll to use a Hero\'s effect, +1 to your roll.',
    requirements: [{ type: 'point', value: 0 }],
    effect: [{
      action: 'HERO_EFFECT_BOOST',
      amount: 1,
    }],
    imagePath: '/api/images/party-leaders/partyleader_bard.png',
  },
  {
    id: 'party-leader-003',
    name: 'The Divine Arrow',
    type: CardType.PartyLeader,
    heroClass: HeroClass.Ranger,
    description: 'Each time you roll to ATTACK a Monster card, +1 to your roll.',
    requirements: [{ type: 'point', value: 0 }],
    effect: [{
      action: 'ATTACK_BOOST',
      amount: 1,
    }],
    imagePath: '/api/images/party-leaders/partyleader_ranger.png',
  },
  {
    id: 'party-leader-004',
    name: 'The Shadow Claw',
    type: CardType.PartyLeader,
    heroClass: HeroClass.Thief,
    description: 'Once per turn on your turn, you may spend one action point to pull a card from another player\'s hand. This leader may not be used in 2-player games.',
    requirements: [{ type: 'point', value: 0 }],
    effect: [{
      action: 'STEAL_CARD',
      amount: 1,
    }],
    imagePath: '/api/images/party-leaders/partyleader_thief.png',
  },
];

export const getPartyLeaderById = (id: string): Card | undefined => {
  return partyLeaderRegistry.find(leader => leader.id === id);
};

export const getAllPartyLeaders = (): Card[] => {
  return partyLeaderRegistry;
};

export const getRandomPartyLeader = (): Card => {
  const randomIndex = Math.floor(Math.random() * partyLeaderRegistry.length);
  return partyLeaderRegistry[randomIndex];
};