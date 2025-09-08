import { useGameActions, useGameState } from "../hooks/use-game-state";
import { useStatus } from "../hooks/use-status";
import { useDice } from "../hooks/use-dice";
import { StatusArea } from "./status-area";
import { DiceResults } from "./dice-results";
import { StartRound } from "./start-round";
import { Clock, User, Loader2 } from "lucide-react";

interface CenterAreaProps {
  diceResults?: number[];
}

export function CenterArea({ diceResults = [] }: CenterAreaProps) {
  const { drawCard, initializeGame, isHost } = useGameActions();
  const { currentTurn, currentPlayer, players } = useGameState();
  const status = useStatus();
  const { enabled: diceEnabled, stable: diceStable, hasRolled, results: diceHookResults, isCapturing, captureStatus } = useDice();
  
  // Get the current turn player's name
  const currentTurnPlayer = players.find(p => p.id === currentTurn);
  const currentTurnPlayerName = currentTurnPlayer?.name || 'Unknown';

  // Determine which dice results to show
  const displayResults = diceEnabled ? diceHookResults : diceResults;

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <div className="flex items-center justify-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm text-gray-600 font-medium">Support Deck</div>
          <div
            className="w-20 aspect-[744/1039] bg-cover bg-center rounded overflow-hidden flex items-center justify-center border-2 border-gray-300 cursor-pointer"
            style={{ backgroundImage: 'url(/heroBack.png)' }}
            onClick={() => drawCard()}
          >
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm text-gray-600 font-medium">Monsters</div>
          <div className="flex gap-2">
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="w-24 aspect-[827/1417] bg-cover bg-center rounded overflow-hidden flex items-center justify-center border-2 border-gray-300"
                style={{ backgroundImage: 'url(/monsterBackBlack.png)' }}
              >
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm text-gray-600 font-medium">Discard</div>
          <div className="w-20 aspect-[744/1039] bg-gray-100 border-2 border-gray-300 rounded overflow-hidden flex items-center justify-center">
            <div className="text-xs text-gray-700">DISCARD</div>
          </div>
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
        <StatusArea header={`${currentTurnPlayerName} is rolling dice... | DEBUG: enabled=${diceEnabled}, stable=${diceStable}, hasRolled=${hasRolled}, captureStatus=${captureStatus}`}>
          <DiceResults 
            diceResults={displayResults} 
          />
        </StatusArea>
      )}
      
      {status === 'dice-capture' && (
        <StatusArea header={`Waiting for ${currentTurnPlayerName} to throw dice | DEBUG: enabled=${diceEnabled}, stable=${diceStable}, hasRolled=${hasRolled}, captureStatus=${captureStatus}`}>
          <DiceResults 
            diceResults={displayResults} 
          />
        </StatusArea>
      )}
      
      {status === 'dice-results' && (
        <StatusArea header={`Dice Results | DEBUG: enabled=${diceEnabled}, stable=${diceStable}, hasRolled=${hasRolled}, captureStatus=${captureStatus}`}>
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