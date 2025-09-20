import { useEffect, useState } from 'react';
import { useDice } from '../hooks/use-dice';
import { StatusBubble } from './ui/status-bubble';

interface DiceResultsProps {
  diceResults?: number[];
  timeout?: number;
  timeRemaining?: number;
  requiredAmount?: number;
  currentRoll?: number | null;
}

export function DiceResults({
  diceResults = [],
  timeout,
  timeRemaining,
  requiredAmount: requiredAmountProp,
  currentRoll,
}: DiceResultsProps) {
  const { captureStatus, requiredAmount: contextRequiredAmount, hasRolled } = useDice();
  const [timeoutProgress, setTimeoutProgress] = useState(0);

  // Track timeout progress when waiting for dice interaction locally
  useEffect(() => {
    if (captureStatus === 'waiting' && !timeout) {
      setTimeoutProgress(0);
      const startTime = Date.now();

      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const timeoutDuration = 30000;
        const progress = Math.min(elapsed / timeoutDuration, 1);
        setTimeoutProgress(progress);

        if (progress >= 1) {
          clearInterval(timer);
        }
      }, 100);

      return () => clearInterval(timer);
    }

    setTimeoutProgress(0);
    return undefined;
  }, [captureStatus, timeout]);

  const validResults = diceResults.filter(result => result > 0);
  const localTotal = validResults.length > 0
    ? validResults.reduce((sum, value) => sum + value, 0)
    : null;

  const normalizedCurrentRoll = typeof currentRoll === 'number' && currentRoll > 0
    ? currentRoll
    : null;

  const total = localTotal ?? normalizedCurrentRoll;
  const hasResult = typeof total === 'number' && total > 0;

  const effectiveRequiredAmount = typeof requiredAmountProp === 'number'
    ? requiredAmountProp
    : (typeof contextRequiredAmount === 'number' ? contextRequiredAmount : 0);

  const meetsRequirement = typeof total === 'number' && effectiveRequiredAmount > 0
    ? total >= effectiveRequiredAmount
    : false;

  const shouldShowPlaceholders =
    !hasRolled ||
    captureStatus === 'waiting' ||
    (!hasResult && captureStatus !== 'complete');

  if (shouldShowPlaceholders) {
    return (
      <div className="flex items-center gap-3">
        <StatusBubble
          progress={timeout ? undefined : timeoutProgress}
          showProgress={timeout ? undefined : true}
          timeout={timeout}
          timeRemaining={timeRemaining}
          variant="default"
          direction="clockwise"
        >
          <div className="text-lg font-bold text-gray-600">?</div>
        </StatusBubble>
        <StatusBubble
          progress={timeout ? undefined : timeoutProgress}
          showProgress={timeout ? undefined : true}
          timeout={timeout}
          timeRemaining={timeRemaining}
          variant="default"
          direction="clockwise"
        >
          <div className="text-lg font-bold text-gray-600">?</div>
        </StatusBubble>
        <div className="text-gray-500 mx-1">=</div>
        <StatusBubble
          progress={timeout ? undefined : timeoutProgress}
          showProgress={timeout ? undefined : true}
          timeout={timeout}
          timeRemaining={timeRemaining}
          variant="default"
          direction="clockwise"
        >
          <div className="text-lg font-bold text-gray-600">?</div>
        </StatusBubble>
      </div>
    );
  }

  const resultVariant = meetsRequirement ? 'success' : 'default';
  const resultTextColor = meetsRequirement ? 'text-green-700' : 'text-gray-600';

  const diceFaceColors = {
    bg: 'bg-gray-100',
    text: 'text-gray-600'
  } as const;

  const shouldShowEquals = validResults.length > 1;

  return (
    <div className="flex items-center gap-3">
      {validResults.length > 0 && (
        <>
          {validResults.map((result, index) => (
            <div
              key={index}
              className={`w-12 h-12 ${diceFaceColors.bg} border-2 border-dashed rounded-lg flex items-center justify-center`}
              style={{ borderColor: 'var(--outline)' }}
            >
              <div className={`text-lg font-bold ${diceFaceColors.text}`}>{result}</div>
            </div>
          ))}
          {shouldShowEquals && <div className="text-gray-500 mx-1">=</div>}
        </>
      )}
      <StatusBubble variant={resultVariant} direction="counterclockwise">
        <div className={`text-lg font-bold ${resultTextColor}`}>
          {typeof total === 'number' ? total : '?'}
        </div>
      </StatusBubble>
    </div>
  );
}
