import { useGameActions, useGameState } from "../hooks/use-game-state";
import { useStatus } from "../hooks/use-status";
import { useDice } from "../hooks/use-dice";
import { StatusArea } from "./status-area";
import { DiceResults } from "./dice-results";
import { StartRound } from "./start-round";
import { Card } from "./card";
import { CardSlot } from "./card-slot";
import { Stack } from "./stack";
import { Clock, User, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { heroRegistry } from "../game/heroes";
import { modifierRegistry } from "../game/modifiers";
import { CardType, HeroClass } from "../types";

interface CenterAreaProps {
  diceResults?: number[];
}

export function CenterArea({ diceResults = [] }: CenterAreaProps) {
  const { drawCard, initializeGame, isHost } = useGameActions();
  const { currentTurn, currentPlayer, players, supportStack, monsters } = useGameState();
  const { status } = useStatus();
  const { enabled: diceEnabled, stable: diceStable, results: diceHookResults, isCapturing, captureStatus } = useDice();
  
  // Track visual deck count - maintains consistent visual appearance
  const [visualDeckCount, setVisualDeckCount] = useState(5);
  const [deckSeed, setDeckSeed] = useState(0);
  
  // Cache state - All modifier cards
  const [cacheCards] = useState(() => {
    return [];
  });
  
  // Update visual deck count when cards are drawn, but add one back for visual continuity
  useEffect(() => {
    if (supportStack.length > 0) {
      setVisualDeckCount(Math.max(5, supportStack.length));
    }
  }, [supportStack.length]);
  
  // Increment seed when a card is drawn to trigger re-render with new randomization
  const handleDrawCard = () => {
    setDeckSeed(prev => prev + 1);
    drawCard();
  };
  
  // Get the current turn player's name
  const currentTurnPlayer = players.find(p => p.id === currentTurn);
  const currentTurnPlayerName = currentTurnPlayer?.name || 'Unknown';

  // Determine which dice results to show
  const displayResults = diceEnabled ? diceHookResults : diceResults;

  return (
    <div className="flex flex-col items-center justify-center gap-6 relative">
      <div className="flex items-center justify-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm text-gray-600 font-medium">Support Deck</div>
          <div onClick={handleDrawCard} className="cursor-pointer">
            <Stack>
              {Array.from({ length: visualDeckCount }, (_, i) => (
                <Card 
                  key={`support-${deckSeed}-${i}`}
                  card={{ 
                    id: `support-${i}`, 
                    name: `Support Deck`, 
                    type: CardType.Hero, 
                    class: HeroClass.Fighter, 
                    requirement: 6,
                    description: 'Support card',
                    effect: []
                  }} 
                  isBack={true}
                  stackIndex={i}
                  randomness={1}
                />
              ))}
            </Stack>
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-4">
            {Array.from({ length: 3 }, (_, i) => (
              <CardSlot key={i} label={i === 0 ? "Monsters" : undefined} size="large" cardType="monster">
                {monsters[i] && (
                  <div className="h-full w-full relative">
                    <Card card={monsters[i]} size="fill" preview={true} />
                  </div>
                )}
              </CardSlot>
            ))}
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm text-gray-600 font-medium">Discard</div>
          <div className="w-28 aspect-[744/1039] bg-gray-100 border-2 border-dashed border-gray-300 rounded overflow-hidden flex items-center justify-center">
            <div className="text-xs text-gray-700">DISCARD</div>
          </div>
        </div>
      </div>
      
      {/* Cache positioned absolutely to escape layout constraints */}
      <div className="absolute bottom-0 right-0 translate-x-[80%] translate-y-12 flex flex-col items-center gap-2 z-10">
        <div className="text-sm text-gray-600 font-medium">Cache</div>
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
      {status === 'waiting-to-start' && (
        <StatusArea header={isHost ? "Ready to start?" : "Waiting for host"}>
          <StartRound 
            onStartRound={initializeGame} 
            disabled={!isHost}
          />
        </StatusArea>
      )}
      
      {status === 'waiting-for-turn' && (
        <StatusArea header={`Waiting for ${currentTurnPlayerName}'s turn`}>
          <div className="w-12 h-12 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-gray-500" />
          </div>
        </StatusArea>
      )}
      
      {status === 'your-turn' && (
        <StatusArea header={`Your turn - ${currentPlayer?.actionPoints || 0} action points`}>
          <div className="w-12 h-12 bg-green-100 border-2 border-dashed border-green-400 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-green-500" />
          </div>
        </StatusArea>
      )}
      
      {status === 'dice-rolling' && (
        <StatusArea header={`${currentTurnPlayerName} is rolling dice...`}>
          <DiceResults 
            diceResults={displayResults} 
          />
        </StatusArea>
      )}
      
      {status === 'dice-capture' && (
        <StatusArea header={`Waiting for ${currentTurnPlayerName} to throw dice`}>
          <DiceResults 
            diceResults={displayResults} 
          />
        </StatusArea>
      )}
      
      {status === 'dice-results' && (
        <StatusArea header={`Dice Results`}>
          <DiceResults 
            diceResults={displayResults} 
          />
        </StatusArea>
      )}
      
      {status === 'game-ended' && (
        <StatusArea header="Dice Results">
          <DiceResults diceResults={diceResults} />
        </StatusArea>
      )}
    </div>
  );
}