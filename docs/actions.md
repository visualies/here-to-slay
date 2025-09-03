# Here to Slay Hero Actions

Here is a list of the distinct actions that can be part of a Hero card's effect, with placeholders for creating a generic `takeAction` function.

### Card Manipulation

*   **DRAW:** `DRAW [amount] cards.`
*   **DISCARD:** `Force a player to DISCARD [amount] cards.`
*   **PULL:** `PULL [amount] random cards from another player's hand.`
*   **GIVE:** `Force players to GIVE [amount] cards from their hand to another player.`
*   **STEAL:** `STEAL [amount] [type] cards from another player.`
*   **SEARCH:** `SEARCH the [location] for a [type] card and add it to your hand.`
*   **LOOK AT:** `LOOK AT another player's hand or the top [amount] cards of the deck.`
*   **RETURN:** `RETURN [amount] [type] cards from a player's party to their hand.`
*   **ADD TO HAND:** `ADD [amount] [type] cards from the discard pile to your hand.`
*   **PLAY:** `PLAY a [type] card immediately without spending an action point.`

### Hero & Card Destruction

*   **DESTROY:** `DESTROY [amount] [type] cards.`
*   **SACRIFICE:** `SACRIFICE [amount] [type] cards.`

### Control & Protection

*   **TAKE CONTROL:** `TAKE CONTROL of [amount] [type] cards for [duration].`
*   **PROTECT:** `PROTECT [amount] of your [type] cards from being destroyed or stolen for [duration].`
*   **PREVENT CHALLENGE:** `PREVENT another player from playing a Challenge card against you.`
*   **DISABLE EFFECT:** `Prevent a [type] card's effect from being used for [duration].`
*   **IMMUNITY:** `Make your [type] cards immune to a specific type of card for [duration].`

### Roll Modification

*   **ADD TO ROLL:** `ADD [amount] to your dice roll.`
*   **SUBTRACT FROM ROLL:** `SUBTRACT [amount] from an opponent's dice roll.`
*   **REROLL:** `REROLL [amount] of your dice again.`

### Turn & Action Point Manipulation

*   **SKIP TURN:** `Force a player to SKIP their next turn.`
*   **EXTRA TURN:** `TAKE [amount] additional turns after your current one.`
*   **FREE ACTION:** `Play a [type] card or perform an action without spending an action point.`

### Monster-Related

*   **SLAY:** `Instantly SLAY a Monster card.`

### Miscellaneous

*   **USE EFFECT:** `USE EFFECT of another [type] card.`