# Hero to Action Mapping

This document explains how each hero maps to a list of actions and their corresponding action files.

## Bards

### Dodgy Dealer
**ID:** `hero-001`
**Requirement:** 5
**Effect:** Exchange cards with another player.
**Actions:**
- `trade-hands.ts`
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`

### Fuzzy Cheeks
**ID:** `hero-002`
**Requirement:** 8
**Effect:**  DRAW a card and play a Hero card from your hand immediately.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `draw-card.ts`
- `play-card.ts`

### Greedy Cheeks
**ID:** `hero-003`
**Requirement:** 8
**Effect:** Each other player must give you a card from their hand.
**Actions:**
- `draw-card.ts`
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `discard-card.ts` source: all other players, target: cache, amount n/a
- `draw-card.ts` source: cache, target: hand, amount: 1
- `discard-card.ts` source: cache, target: discard-pile, amount: all

### Lucky Bucky
**ID:** `hero-004`
**Requirement:** 7
**Effect:** Pull a card from another player's hand. If that card is a Hero card, you may play it immediately
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `steal-card.ts` source: any-hand, target: cache, amount: 1
- `play-card.ts` source: cache, type: hero
- `draw-card.ts` source: cache, target: hand, amount: all
  (COULD WORK WITH EVENTS TOO, saves us the type param)

### Mellow Dee
**ID:** `hero-005`
**Requirement:** 7
**Effect:** DRAW a card. If that card is a Hero card, you may play it immediately.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `draw-card.ts` source: support-deck, target: cache, amount: 1
- `play-card.ts` source: cache, type: hero
- `draw-card.ts` source: cache, target: hand, amount: all

### Napping Nibbles
**ID:** `hero-006`
**Requirement:** 2
**Effect:** Do nothing.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`

### Peanut
**ID:** `hero-007`
**Requirement:** 7
**Effect:** RAW 2 cards.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `draw-card.ts` amount: 2

### Tipsy Tootie
**ID:** `hero-008`
**Requirement:** 6
**Effect:** Choose a player. STEAL a Hero card from that player's Party and move Tipsy Tootie to that player's Party.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `steal-card.ts`selection: input, source: any-party, target: your-party, amount: 1
- `move-card.ts` selection: last-selection, source: your-party, target: last-source, amount: 1 (NOT IMPLEMENTED YET)

## Fighters

### Bad Axe
**ID:** `hero-009`
**Requirement:** 8
**Effect:** Destroy a Hero card.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `destroy-card.ts` source: any-party, amount: 1

### Bear Claw
**ID:** `hero-010`
**Requirement:** 7
**Effect:** Pull a card from another player's hand. If it is a Hero card, pull a second card from that player's hand.
**Actions:**
- `claw-swipe.ts`
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `draw-card.ts` source: any-hand, target: cache, amount: 1
  (NEEDS EVENTS TO WORK)

### Beary Wise
**ID:** `hero-011`
**Requirement:** 7
**Effect:** Each other player must DISCARD a card. Choose one of the discarded cards and add it to your hand.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `discard-card.ts` source: other-hands, target: cache, amount: 1
- `pick-card.ts` source: cache, target: your-hand, amount: 1, type: any
- `discard-card.ts` source: cache, target: discard-pile, amount: all

### Fury Knuckle
**ID:** `hero-012`
**Requirement:** 5
**Effect:** Pull a card from another player's hand. If it is a Challenge card, pull a second card from that player's hand.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `rage-mode.ts`
  (NEEDS EVENTS TO WORK)

### Heavy Bear
**ID:** `hero-013`
**Requirement:** 5
**Effect:** Choose a player. That player must DISCARD 2 cards.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `discard-card.ts` source: any-hand, target: discard-pile, amount: 2

### Pan Chucks
**ID:** `hero-014`
**Requirement:** 8
**Effect:** DRAW 2 cards. If at least one of those cards is a Challenge card, you may reveal it, then DESTROY a Hero card.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `dual-strike.ts`
- `whirlwind.ts`
(NEEDS EVENTS TO WORK)

### Qi Bear
**ID:** `hero-015`
**Requirement:** 10
**Effect:** DISCARD up to 3 cards. For each card discarded, DESTROY a Hero card.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `chi-blast.ts`
- `meditation.ts`
(NEEDS EVENTS TO WORK)

### Tough Teddy
**ID:** `hero-016`
**Requirement:** 4
**Effect:** Each other player with a Fighter in their Party must DISCARD a card.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `discard-card.ts` source: other-parties-with-fighter, target: discard-pile, amount: 1

## Guardians

### Calming Voice
**ID:** `hero-017`
**Requirement:** 9
**Effect:** Hero cards in your Party cannot be stolen until your next turn.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `calming-presence.ts`
- `voice-of-peace.ts`
(NEEDS EVENTS TO WORK)

### Guiding Light
**ID:** `hero-018`
**Requirement:** 7
**Effect:** Search the discard pile for a Hero card and add it to your hand.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `pick-card.ts` source: discard-pile, target: hand, type: hero

### Holy Curselifter
**ID:** `hero-019`
**Requirement:** 5
**Effect:** HtS-5plus.png Return a Cursed Item card equipped to a Hero card in your Party to your hand.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `pick-card.ts` source: your-party, target: hand, type: item

### Iron Resolve
**ID:** `hero-020`
**Requirement:** 8
**Effect:** Cards you play cannot be challenged for the rest of your turn.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `iron-will.ts`
- `steadfast-guard.ts`
(NEEDS EVENTS TO WORK)

### Mighty Blade
**ID:** `hero-021`
**Requirement:** 8
**Effect:** Hero cards in your Party cannot be destroyed until your next turn.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `blessed-strike.ts`
- `divine-sword.ts`
(NEEDS EVENTS TO WORK)

### Radiant Horn
**ID:** `hero-022`
**Requirement:** 6
**Effect:** Search the discard pile for a Modifier card and add it it to your hand.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `radiant-blast.ts`
- `pick-card.ts` source: discard-pile, target: hand, type: modifier

### Vibrant Glow
**ID:** `hero-023`
**Requirement:** 9
**Effect:** +5 to all your rolls until the end of your turn.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `vibrant-aura.ts`
- `healing-glow.ts`
(NEEDS EVENTS TO WORK)

### Wise Shield
**ID:** `hero-024`
**Requirement:** 6
**Effect:** +3 to all your rolls until the end of your turn.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `protective-ward.ts`
- `wisdom-barrier.ts`
(NEEDS EVENTS TO WORK)

## Rangers

### Bullseye
**ID:** `hero-025`
**Requirement:** 7
**Effect:** Look at the top 3 cards of the deck. Add one to your hand, then return the other two to the top of the deck in any order.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `draw-card.ts` source: support-deck, target: cache, amount: 3
- `pick-card.ts` source: cache, target: hand, type: any, amount 1
- `pick-card.ts` source: cache, target: support-deck, type: any, amount 2

### Hook
**ID:** `hero-026`
**Requirement:** 6
**Effect:** Play an item card from your hand immediately and DRAW a card.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `play-card.ts` source: hand, type: item
- `draw-card.ts` source: support-deck, target: hand

### Lookie Rookie
**ID:** `hero-027`
**Requirement:** 5
**Effect:** Search the discard pile for an item card and add it to your hand.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `pick-card.ts` source: discard-pile, target: hand, type: item

### Quick Draw
**ID:** `hero-028`
**Requirement:** 8
**Effect:** DRAW 2 cards. If at least one of those cards is an item card, you may play one of them immediately.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `lightning-shot.ts`
- `fast-draw.ts`
  (NEEDS EVENTS TO WORK)

### Serious Grey
**ID:** `hero-029`
**Requirement:** 9
**Effect:** DESTROY a Hero and DRAW a card.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `destroy-card.ts` target: any-party, amount: 1
- `draw-card.ts` source: support-deck, target: hand, amount: 1

### Sharp Fox
**ID:** `hero-030`
**Requirement:** 5
**Effect:** Look at another player's hand
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `pick-card.ts` source: any-player, target: cache, amount: 0

### Wildshot
**ID:** `hero-031`
**Requirement:** 8
**Effect:** DRAW 3 cards and DISCARD a card.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `draw-card.ts` source: support-deck, target: hand, amount: 3
- `discard-card.ts` source: hand, target: discard-pile, amount: 1

### Wily Red
**ID:** `hero-032`
**Requirement:** 10
**Effect:** DRAW cards until you have 7 cards in your hand.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `clever-trap.ts`
- `wily-escape.ts`
(NEEDS EVENTS TO WORK)
  (trigger: if less than x cards in hand, repeat: max 7, duration: this move)

## Thieves

### Kit Napper
**ID:** `hero-033`
**Requirement:** 9
**Effect:** STEAL a Hero card.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `steal-card.ts` source: any-party, target: party, amount: 1

### Meowzio
**ID:** `hero-034`
**Requirement:** 10
**Effect:** Choose a player. STEAL a Hero from that player and pull a card from that player's hand.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `steal-card.ts` source: any-party, target: party, amount: 1 
- `draw-card.ts` source: last-source, ?? (WILL NOT WORK SINCE WE NEED THE PLAYERS HAND)

### Plundering Puma
**ID:** `hero-035`
**Requirement:** 6
**Effect:** Pull 2 cards from another player's hand. That player may DRAW a card.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `draw-card.ts` source: any-hand, target: hand, amount: 2
- `draw-card.ts` source: support-deck, target: last-source, amount: 1

### Shurikitty
**ID:** `hero-036`
**Requirement:** 9
**Effect:** DESTROY a Hero card. If that Hero card had an item card equipped to it, add that item card to your hand instead of moving it to the discard pile.
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `throwing-stars.ts`
- `ninja-vanish.ts`
  (NEEDS EVENTS TO WORK)

### Silent Shadow
**ID:** `hero-037`
**Requirement:** 8
**Effect:** Look at another player's hand. Choose a card and add it to your hand.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `pick-card.ts` source: any-hand, target: hand, type: all, amount: 1

### Slippery Paws
**ID:** `hero-038`
**Requirement:** 6
**Effect:** Pull 2 cards from another player's hand, then DISCARD one of those cards.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `draw-card.ts` source: any-hand, target: cache, amount: 2
- `pick-card.ts` source: cache, target: hand, amount: 1, type: all
- `dicard-card.ts` source: cache, target: discard-pile, amount: all

### Sly Pickings
**ID:** `hero-039`
**Requirement:** 6
**Effect:** Pull a card from another player's hand. If that card is an item card, you may play it immediately.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `draw-card.ts` source: any-hand, target: cache, amount: 1
- `play-card.ts` source: cache, type: item
- `draw-card.ts` source: cache, target: hand, amount: all

### Smooth Mimimeow
**ID:** `hero-040`
**Requirement:** 7
**Effect:** Pull a card from the hand of each other player with a Thief in their Party.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `draw-card.ts` source: other-parties-with-thief, target: hand, amount: 1

## Wizards

### Bun Bun
**ID:** `hero-041`
**Requirement:** 5
**Effect:** Search the discard pile for a Magic card and add it to your hand.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `pick-card.ts` source: discard-pile, target: hand, type: magic, amount: 1

### Buttons
**ID:** `hero-042`
**Requirement:** 6
**Effect:** Pull a card from another player's hand. If it is a Magic card, you may play it immediately.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `draw-card.ts` source: any-hand, target: cache, amount: 1
- `play-card.ts` source: cache, type: magic
- `draw-card.ts` source: cache, target: hand, amount: all

### Fluffy
**ID:** `hero-043`
**Requirement:** 10
**Effect:** DESTROY 2 Hero cards
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `destroy-card.ts` source: any-party, amount: 2

### Hopper
**ID:** `hero-044`
**Requirement:** 7
**Effect:** Choose a player. That player must SACRIFICE a Hero card.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `sacrifice-card.ts` source: any-party, type: hero, amount: 1

### Snowball
**ID:** `hero-045`
**Requirement:** 6
**Effect:** DRAW a card. If it is a Magic card, you may play it immediately and DRAW a second card.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `frost-blast.ts`
- `ice-shield.ts`
  (NEEDS EVENTS TO WORK)

### Spooky
**ID:** `hero-046`
**Requirement:** 10
**Effect:** Each other player must SACRIFICE a Hero card.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `dark-ritual.ts`
- `sacrifice-card.ts` source: other-parties, type: hero, amount: 1

### Whiskers
**ID:** `hero-047`
**Requirement:** 11
**Effect:** STEAL a Hero card and DESTROY a Hero card.
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `steal-card.ts` source: any-party, target: hand, amount: 1
- `destroy-card.ts` source: any-party, amount: 1
- 
### Wiggles
**ID:** `hero-048`
**Requirement:** 10
**Effect:** STEAL a Hero and roll to use its effect immediately
**Actions:**
- `deduct-point.ts`
- `place-card.ts`
- `capture-challenge.ts`
- `capture-dice.ts`
- `capture-modifier.ts`
- `end-move.ts`
- `steal-card.ts` source: any-party, target: cache, amount: 1
- `play-card.ts` source: cache, type: hero

---

## Available Action Files

Current action files in`/servers/room-server/actions/`:
- `draw-card.ts`
- `capture-dice.ts`
- `capture-challenge.ts`
- `capture-modifier.ts`
- `discard-card.ts`
- `deduct-point.ts`
- `steal-card.ts`
- `destroy-card.ts`
- `sacrifice-card.ts`
- `place-card.ts`
- `play-card.ts`
- `end-turn.ts`
- `end-move.ts`
- `trade-hands.ts`

## Action Files Overview

This template now includes all heroes with Lorem ipsum placeholder text that can be easily replaced with actual hero descriptions and effects. Each hero has been assigned unique IDs and thematic action files that correspond to their abilities. 