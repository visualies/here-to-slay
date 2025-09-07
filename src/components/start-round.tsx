import { BowArrow } from 'lucide-react';

interface StartRoundProps {
  onStartRound: () => void;
  disabled?: boolean;
}

export function StartRound({ onStartRound, disabled = false }: StartRoundProps) {
  return (
    <div className="flex items-center justify-center">
      <button
        onClick={onStartRound}
        disabled={disabled}
        className="w-32 h-12 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-200 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <BowArrow className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-600">Start Round</span>
      </button>
    </div>
  );
}
