export enum StatusKey {
  // Game state statuses
  WAITING_TO_START = 'waiting-to-start',
  WAITING_FOR_TURN = 'waiting-for-turn',
  YOUR_TURN = 'your-turn',
  CAPTURE_DICE = 'capture-dice',
  GAME_ENDED = 'game-ended',
  WAITING = 'waiting',

  // Action statuses
  DRAW_CARD = 'draw-card',
  CAPTURE_MODIFIER = 'capture-modifier',
  CAPTURE_CHALLENGE = 'capture-challenge',
  DISCARD_CARD = 'discard-card',
  DEDUCT_POINT = 'deduct-point',
  STEAL_CARD = 'steal-card',
  DESTROY_CARD = 'destroy-card',
  SACRIFICE_CARD = 'sacrifice-card',
  PLACE_CARD = 'place-card',
  PLAY_CARD = 'play-card',
  END_TURN = 'end-turn',
  END_MOVE = 'end-move',
  PICK_CARD = 'pick-card'
}

export interface GameStatus {
  key: StatusKey;
  message: string;
  timeout?: number;
  timeoutAt?: number;
  timeRemaining?: number;
}