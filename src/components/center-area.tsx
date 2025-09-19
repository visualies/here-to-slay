import { useGameActions } from "../hooks/use-game-actions";
import { useGameState } from "../hooks/use-game-state";
import { useStatus } from "../hooks/use-status";
import { useDice } from "../hooks/use-dice";
import { useCardOriginSizing } from "../hooks/use-card-origin-sizing";
import { StatusArea } from "./status-area";
import { DiceResults } from "./dice-results";
import { StartRound } from "./start-round";
import { Card } from "./card";
import { CardSlot } from "./card-slot";
import { CardOrigin } from "./card-origin";
import { Stack } from "./stack";
import {
  Clock,
  User,
  Plus,
  Target,
  Swords,
  Trash2,
  Minus,
  RotateCcw,
  Bomb,
  Skull,
  Hand,
  Play,
  StopCircle,
  ArrowRight,
  PickaxeIcon as Pick
} from "lucide-react";
import { StatusBubble } from "./ui/status-bubble";
import { useState, useEffect } from "react";
import { CardType, HeroClass, Card as GameCard, StatusKey } from "../types";

interface CenterAreaProps {
  diceResults?: number[];
  debugMode?: boolean;
}

export function CenterArea({ diceResults = [], debugMode = false }: CenterAreaProps) {
  const { playCard } = useGameActions();
  const { currentTurn, currentTurnData, currentPlayer, players, supportStack, monsters, initializeGame, isHost } = useGameState();
  const { status } = useStatus();
  const { enabled: diceEnabled, results: diceHookResults } = useDice();
  const { getTargetDimensions } = useCardOriginSizing();
  
  // Track visual deck count - maintains consistent visual appearance
  const [visualDeckCount, setVisualDeckCount] = useState(5);
  const [deckSeed, setDeckSeed] = useState(0);
  
  // Cache state - All modifier cards
  const [cacheCards] = useState<GameCard[]>(() => {
    return [];
  });
  
  // Update visual deck count when cards are drawn, but add one back for visual continuity
  useEffect(() => {
    if (supportStack.length > 0) {
      setVisualDeckCount(Math.max(5, supportStack.length));
    }
  }, [supportStack.length]);
  
  // Increment seed when a card is drawn to trigger re-render with new randomization
  const handleDrawCard = async () => {
    setDeckSeed(prev => prev + 1);
    await playCard('draw-001'); // Use special draw card ID as per API
  };
  
  // Get the current turn player's name
  const currentTurnPlayer = players.find(p => p.id === currentTurn);
  const currentTurnPlayerName = currentTurnPlayer?.name || 'Unknown';

  // Determine which dice results to show
  const displayResults = diceEnabled ? diceHookResults : diceResults;
  
  // Get dimensions for center-discard to match party-bottom-default
  const discardDimensions = getTargetDimensions('party-bottom-default');
  
  // Get dimensions for monster slots to match party leader size (already scaled)
  const monsterDimensions = getTargetDimensions('party-bottom-large');

  return (
    <div 
      className={`flex flex-col items-center justify-center relative ${debugMode ? 'bg-red-100 outline outline-2 outline-red-300 p-4' : ''}`}
    >
      
      <div className="flex items-center justify-center gap-[8%]">
        <div className="flex flex-col items-center gap-2">
          <div className="text-base text-muted-foreground font-heading">Support</div>
          <CardOrigin 
            id="center-support-deck"
            aspectRatio="default" 
            orientation="horizontal" 
            debugMode={debugMode}
            dimensions={discardDimensions || undefined}
          >
            <div onClick={handleDrawCard} className="cursor-pointer w-full h-full" data-testid="draw-card-button">
              <Stack className="w-full h-full">
                {Array.from({ length: visualDeckCount }, (_, i) => (
                  <Card 
                    key={`support-${deckSeed}-${i}`}
                    card={{ 
                      id: `support-${i}`, 
                      name: `Support`, 
                      type: CardType.Hero, 
                      heroClass: HeroClass.Fighter, 
                      requirements: [{ type: 'point', value: 6 }],
                      description: 'Support card',
                      effect: []
                    }} 
                    isBack={true}
                    stackIndex={i}
                    randomness={1}
                    size="fill"
                  />
                ))}
              </Stack>
            </div>
          </CardOrigin>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <div className="text-base text-muted-foreground font-heading">Monsters</div>
          <div className="flex justify-center gap-[5%]">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <CardOrigin 
                  id={`center-monster-${i}`}
                  aspectRatio="default" 
                  orientation="horizontal" 
                  debugMode={debugMode}
                  dimensions={monsterDimensions || undefined}
                >
                  <CardSlot size="auto" cardType="monster" hideOutline={!!monsters[i]}>
                    {monsters[i] && (
                      <div className="h-full w-full relative">
                        <Card card={monsters[i]} size="fill" preview={true} />
                      </div>
                    )}
                  </CardSlot>
                </CardOrigin>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <div className="text-base text-muted-foreground font-heading">Discard</div>
          <CardOrigin 
            id="center-discard"
            aspectRatio="default" 
            orientation="horizontal" 
            debugMode={debugMode}
            dimensions={discardDimensions || undefined}
          >
            <CardSlot size="auto" cardType="hero">
            </CardSlot>
          </CardOrigin>
        </div>
      </div>
      
      {/* Cache positioned absolutely to escape layout constraints */}
      <div className={`absolute bottom-0 right-0 translate-x-[80%] translate-y-12 flex flex-col items-center gap-2 z-10 ${debugMode ? 'outline outline-2 outline-red-300 p-2' : ''}`}>
        <div className="flex items-center justify-center">
          <Stack>
            {cacheCards.map((card, index) => (
              <Card 
                key={card.id}
                card={card}
                isBack={false}
                stackIndex={index}
                randomness={5}
                size="default"
              />
            ))}
          </Stack>
        </div>
      </div>
      
      {/* Status Area - Dynamic content based on status */}
      <div className="mt-[2%]">
        {status.key === StatusKey.WAITING_TO_START && (
          <StatusArea header={isHost ? "Ready to start?" : "Waiting for host"}>
            <StartRound
              onStartRound={initializeGame}
              disabled={!isHost}
            />
          </StatusArea>
        )}

        {status.key === StatusKey.WAITING_FOR_TURN && (
          <StatusArea header={status.message}>
            <StatusBubble
              variant="default"
              timeout={status.timeout}
              timeRemaining={status.timeRemaining}
              direction="counterclockwise"
            >
              <Clock className="w-5 h-5 text-gray-600" />
            </StatusBubble>
          </StatusArea>
        )}

        {status.key === StatusKey.YOUR_TURN && (
          <StatusArea header={status.message}>
            <div className="w-[clamp(2rem,6cqw,3rem)] h-[clamp(2rem,6cqw,3rem)] bg-green-100 border-2 border-dashed rounded-lg flex items-center justify-center" style={{ borderColor: "var(--outline)" }}>
              <User className="w-4 h-4 text-green-500" />
            </div>
          </StatusArea>
        )}

        {status.key === StatusKey.CAPTURE_DICE && (
          <StatusArea header={status.message}>
            <DiceResults
              diceResults={displayResults}
              timeout={status.timeout}
              timeRemaining={status.timeRemaining}
            />
          </StatusArea>
        )}

        {status.key === StatusKey.GAME_ENDED && (
          <StatusArea header={status.message}>
            <DiceResults diceResults={diceResults} />
          </StatusArea>
        )}

        {/* Action-specific status bubbles */}
        {status.key === StatusKey.DRAW_CARD && (
          <StatusArea header={status.message}>
            <StatusBubble
              variant="default"
              timeout={status.timeout}
              timeRemaining={status.timeRemaining}
              direction="counterclockwise"
              data-testid="draw-card-action-bubble"
            >
              <Plus className="w-5 h-5 text-gray-600" />
            </StatusBubble>
          </StatusArea>
        )}

        {status.key === StatusKey.CAPTURE_MODIFIER && (
          <StatusArea header={status.message}>
            <StatusBubble
              variant="default"
              timeout={status.timeout}
              timeRemaining={status.timeRemaining}
              direction="counterclockwise"
              data-testid="capture-modifier-action-bubble"
            >
              <Target className="w-5 h-5 text-gray-600" />
            </StatusBubble>
          </StatusArea>
        )}

        {status.key === StatusKey.CAPTURE_CHALLENGE && (
          <StatusArea header={status.message}>
            <StatusBubble
              variant="default"
              timeout={status.timeout}
              timeRemaining={status.timeRemaining}
              direction="counterclockwise"
              data-testid="capture-challenge-action-bubble"
            >
              <Swords className="w-5 h-5 text-gray-600" />
            </StatusBubble>
          </StatusArea>
        )}

        {status.key === StatusKey.DISCARD_CARD && (
          <StatusArea header={status.message}>
            <StatusBubble
              variant="default"
              timeout={status.timeout}
              timeRemaining={status.timeRemaining}
              direction="counterclockwise"
            >
              <Trash2 className="w-5 h-5 text-gray-600" />
            </StatusBubble>
          </StatusArea>
        )}

        {status.key === StatusKey.DEDUCT_POINT && (
          <StatusArea header={status.message}>
            <StatusBubble
              variant="default"
              timeout={status.timeout}
              timeRemaining={status.timeRemaining}
              direction="counterclockwise"
            >
              <Minus className="w-5 h-5 text-gray-600" />
            </StatusBubble>
          </StatusArea>
        )}

        {status.key === StatusKey.STEAL_CARD && (
          <StatusArea header={status.message}>
            <StatusBubble
              variant="default"
              timeout={status.timeout}
              timeRemaining={status.timeRemaining}
              direction="counterclockwise"
            >
              <RotateCcw className="w-5 h-5 text-gray-600" />
            </StatusBubble>
          </StatusArea>
        )}

        {status.key === StatusKey.DESTROY_CARD && (
          <StatusArea header={status.message}>
            <StatusBubble
              variant="default"
              timeout={status.timeout}
              timeRemaining={status.timeRemaining}
              direction="counterclockwise"
            >
              <Bomb className="w-5 h-5 text-gray-600" />
            </StatusBubble>
          </StatusArea>
        )}

        {status.key === StatusKey.SACRIFICE_CARD && (
          <StatusArea header={status.message}>
            <StatusBubble
              variant="default"
              timeout={status.timeout}
              timeRemaining={status.timeRemaining}
              direction="counterclockwise"
            >
              <Skull className="w-5 h-5 text-gray-600" />
            </StatusBubble>
          </StatusArea>
        )}

        {status.key === StatusKey.PLACE_CARD && (
          <StatusArea header={status.message}>
            <StatusBubble
              variant="default"
              timeout={status.timeout}
              timeRemaining={status.timeRemaining}
              direction="counterclockwise"
            >
              <Hand className="w-5 h-5 text-gray-600" />
            </StatusBubble>
          </StatusArea>
        )}

        {status.key === StatusKey.PLAY_CARD && (
          <StatusArea header={status.message}>
            <StatusBubble
              variant="default"
              timeout={status.timeout}
              timeRemaining={status.timeRemaining}
              direction="counterclockwise"
            >
              <Play className="w-5 h-5 text-gray-600" />
            </StatusBubble>
          </StatusArea>
        )}

        {status.key === StatusKey.END_TURN && (
          <StatusArea header={status.message}>
            <StatusBubble
              variant="default"
              timeout={status.timeout}
              timeRemaining={status.timeRemaining}
              direction="counterclockwise"
            >
              <StopCircle className="w-5 h-5 text-gray-600" />
            </StatusBubble>
          </StatusArea>
        )}

        {status.key === StatusKey.END_MOVE && (
          <StatusArea header={status.message}>
            <StatusBubble
              variant="default"
              timeout={status.timeout}
              timeRemaining={status.timeRemaining}
              direction="counterclockwise"
            >
              <ArrowRight className="w-5 h-5 text-gray-600" />
            </StatusBubble>
          </StatusArea>
        )}

        {status.key === StatusKey.PICK_CARD && (
          <StatusArea header={status.message}>
            <StatusBubble
              variant="default"
              timeout={status.timeout}
              timeRemaining={status.timeRemaining}
              direction="counterclockwise"
            >
              <Pick className="w-5 h-5 text-gray-600" />
            </StatusBubble>
          </StatusArea>
        )}

      </div>
    </div>
  );
}