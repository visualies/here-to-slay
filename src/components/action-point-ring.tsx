"use client";

interface ActionPointRingProps {
  current: number;
  max: number;
  className?: string;
}

export function ActionPointRing({ current, max, className = "" }: ActionPointRingProps) {
  const percentage = Math.min(current / max, 1);
  const perimeter = 4 * 20; // perimeter of rounded square (4 sides * 20px each)
  const strokeDasharray = current > 0 ? `${percentage * perimeter} ${perimeter}` : "2 4";

  return (
    <div className={`relative flex items-center justify-center bg-white rounded p-1 ${className}`}>
      <svg 
        width="28" 
        height="28" 
        viewBox="0 0 28 28"
      >
        {/* Background dotted square - always visible */}
        <rect
          x="4"
          y="4"
          width="20"
          height="20"
          rx="3"
          ry="3"
          stroke="currentColor"
          strokeWidth="2"
          fill="white"
          strokeDasharray="2 4"
          className="text-gray-300"
        />
        {/* Progress square - only visible when current > 0 */}
        {current > 0 && (
          <rect
            x="4"
            y="4"
            width="20"
            height="20"
            rx="3"
            ry="3"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeDasharray={strokeDasharray}
            className="text-gray-300 transition-all duration-300"
          />
        )}
      </svg>
      {/* Counter in the middle */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-gray-300">{current}</span>
      </div>
    </div>
  );
}