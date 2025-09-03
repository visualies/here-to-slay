export function CenterArea() {
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
    </div>
  );
}