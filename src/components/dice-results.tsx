interface DiceResultsProps {
  diceResults: number[];
}

export function DiceResults({ diceResults = [] }: DiceResultsProps) {
  const validResults = diceResults.filter(r => r > 0);
  const total = validResults.reduce((sum, val) => sum + val, 0);

  // Map dice face values to their corresponding colors (matching actual dice faces)
  const getDiceFaceColor = (value: number) => {
    switch (value) {
      case 1: return { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-700' }; // Right - Blue
      case 2: return { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-700' }; // Front - Magenta
      case 3: return { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-700' }; // Top - Red
      case 4: return { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-700' }; // Bottom - Green
      case 5: return { bg: 'bg-cyan-100', border: 'border-cyan-400', text: 'text-cyan-700' }; // Back - Cyan
      case 6: return { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-700' }; // Left - Yellow
      default: return { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-700' };
    }
  };

  return (
    <div className="flex items-center gap-3">
      {validResults.length > 0 ? (
        <>
          {validResults.map((result, index) => {
            const colors = getDiceFaceColor(result);
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
              <div className="w-12 h-12 bg-green-100 border-2 border-dashed border-green-400 rounded-lg flex items-center justify-center">
                <div className="text-lg font-bold text-green-700">{total}</div>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {/* Show placeholder dice when no results */}
          <div className="w-12 h-12 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            <div className="text-lg font-bold text-gray-400">?</div>
          </div>
          <div className="w-12 h-12 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            <div className="text-lg font-bold text-gray-400">?</div>
          </div>
          <div className="text-gray-500 mx-1">=</div>
          <div className="w-12 h-12 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            <div className="text-lg font-bold text-gray-400">?</div>
          </div>
        </>
      )}
    </div>
  );
}
