"use client";

interface PlayerAreaDemoProps {
  position: "top" | "right" | "bottom" | "left";
  debugMode?: boolean;
}

export function PlayerAreaDemo({ position, debugMode = false }: PlayerAreaDemoProps) {
  const needsTopRotation = position === "top";
  const needsSideRotation = position === "left" || position === "right";

  const content = (
    <div className={`flex gap-1 h-full w-full ${debugMode ? 'bg-red-500/10 border border-red-500/30' : ''}`}>
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={`demo-rect-${index}`}
          className="bg-blue-500/30 border-2 border-blue-700 rounded flex-1"
          style={{ aspectRatio: '5/7' }}
        />
      ))}
    </div>
  );

  if (needsTopRotation) {
    return (
      <div className="rotate-180">
        {content}
      </div>
    );
  }

  if (needsSideRotation) {
    return (
      <div className="rotate-90">
        {content}
      </div>
    );
  }

  return content;
}
