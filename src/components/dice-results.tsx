import { useDice } from '../hooks/use-dice';
import { useState, useEffect } from 'react';
import { StatusBubble } from './ui/status-bubble';

interface DiceResultsProps {
  diceResults: number[];
}

export function DiceResults({ diceResults = [] }: DiceResultsProps) {
  const diceContext = useDice();
  const { captureStatus, requiredAmount } = diceContext;
  const validResults = diceResults.filter(r => r > 0);
  const [completionProgress, setCompletionProgress] = useState(0);
  
  // Handle completion timer when status is 'complete'
  useEffect(() => {
    if (captureStatus === 'complete') {
      setCompletionProgress(0);
      const startTime = Date.now();
      
      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / 4000, 1); // 4 seconds total
        setCompletionProgress(progress);
        
        if (progress >= 1) {
          clearInterval(timer);
        }
      }, 50); // 20fps for smoother animation
      
      return () => clearInterval(timer);
    } else {
      setCompletionProgress(0);
    }
  }, [captureStatus]);
  
  const total = validResults.reduce((sum, val) => sum + val, 0);

  // Check if dice result meets required amount
  const meetsRequirement = (total: number, required: number): boolean => {
    if (required === 0) return false; // 0 means no requirement set
    return total >= required;
  };

  // All dice faces and result use same gray as Start Round button
  const getDiceFaceColor = () => {
    return { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-600' };
  };

  // Result color based on requirement
  const getResultColor = (total: number) => {
    const meetsReq = meetsRequirement(total, requiredAmount);
    if (meetsReq) {
      return { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-700' };
    }
    return { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-600' };
  };

  // Show question marks only when waiting
  if (captureStatus === 'waiting') {
    return (
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
          <div className="text-lg font-bold text-gray-600">?</div>
        </div>
        <div className="w-12 h-12 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
          <div className="text-lg font-bold text-gray-600">?</div>
        </div>
        <div className="text-gray-500 mx-1">=</div>
        <div className="w-12 h-12 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
          <div className="text-lg font-bold text-gray-600">?</div>
        </div>
      </div>
    );
  }


  return (
    <div className="flex items-center gap-3">
      {validResults.length > 0 ? (
        <>
          {validResults.map((result, index) => {
            const colors = getDiceFaceColor();
            return (
              <div
                key={index}
                className={`w-12 h-12 ${colors.bg} border-2 border-dashed ${colors.border} rounded-lg flex items-center justify-center`}
              >
                <div className={`text-lg font-bold ${colors.text}`}>{result}</div>
              </div>
            );
          })}
          {validResults.length > 1 && (
            <>
              <div className="text-gray-500 mx-1">=</div>
              <StatusBubble
                progress={completionProgress}
                showProgress={captureStatus === 'complete'}
                variant={meetsRequirement(total, requiredAmount) ? 'success' : 'default'}
              >
                <div className={`text-lg font-bold ${getResultColor(total).text}`}>{total}</div>
              </StatusBubble>
            </>
          )}
        </>
      ) : (
        <>
          {/* Show placeholder dice when no results */}
          <div className="w-12 h-12 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            <div className="text-lg font-bold text-gray-600">?</div>
          </div>
          <div className="w-12 h-12 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            <div className="text-lg font-bold text-gray-600">?</div>
          </div>
          <div className="text-gray-500 mx-1">=</div>
          <div className="w-12 h-12 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            <div className="text-lg font-bold text-gray-600">?</div>
          </div>
        </>
      )}
    </div>
  );
}
