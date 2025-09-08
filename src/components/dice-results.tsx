import { useDice } from '../hooks/use-dice';

interface DiceResultsProps {
  diceResults: number[];
}

export function DiceResults({ diceResults = [] }: DiceResultsProps) {
  const { captureStatus, requiredAmount } = useDice();
  const validResults = diceResults.filter(r => r > 0);
  const total = validResults.reduce((sum, val) => sum + val, 0);

  // Check if dice result meets required amount
  const meetsRequirement = (total: number, required: number | null): boolean => {
    if (!required) return false;
    return total >= required;
  };

  // All dice faces and result use same gray as Start Round button
  const getDiceFaceColor = () => {
    return { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-600' };
  };

  // Result always uses same gray as Start Round button
  const getResultColor = () => {
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
              <div className={`w-12 h-12 ${getResultColor(total).bg} border-2 border-dashed ${getResultColor(total).border} rounded-lg flex items-center justify-center`}>
                <div className={`text-lg font-bold ${getResultColor(total).text}`}>{total}</div>
              </div>
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
