interface CenterAreaProps {
  diceResults?: number[];
}

export function CenterArea({ diceResults = [] }: CenterAreaProps) {
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
    <div className="flex flex-col items-center justify-center gap-6">
      <div className="flex items-center justify-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm text-gray-600 font-medium">Support Deck</div>
          <div className="w-16 h-24 bg-blue-100 border-2 border-blue-300 rounded-lg flex items-center justify-center">
            <div className="text-xs text-blue-700">DECK</div>
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm text-gray-600 font-medium">Monsters</div>
          <div className="flex gap-2">
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="w-20 h-28 bg-red-100 border-2 border-red-300 rounded-lg flex items-center justify-center"
              >
                <div className="text-xs text-red-700">MONSTER</div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm text-gray-600 font-medium">Discard</div>
          <div className="w-16 h-24 bg-gray-100 border-2 border-gray-300 rounded-lg flex items-center justify-center">
            <div className="text-xs text-gray-700">DISCARD</div>
          </div>
        </div>
      </div>
      
      {/* Dice Results Display */}
      {validResults.length > 0 && (
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm text-gray-600 font-medium">Dice Results</div>
          <div className="flex items-center gap-3">
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
          </div>
        </div>
      )}
    </div>
  );
}