import { CardSlot } from "./CardSlot";

interface PlayerAreaProps {
  position: "top" | "right" | "bottom" | "left";
}

function PlayerAreaContent() {
  return (
    <div className="flex items-center gap-2 p-4">
      <CardSlot label="Party Leader" className="flex-shrink-0" size="large" />
      <div className="flex gap-1">
        {Array.from({ length: 6 }, (_, i) => (
          <CardSlot key={i} label={i === 0 ? "Heroes" : undefined} size="small" />
        ))}
      </div>
    </div>
  );
}

export function PlayerArea({ position }: PlayerAreaProps) {
  const rotationClass = {
    top: "rotate-180",
    right: "-rotate-90", 
    left: "rotate-90",
    bottom: ""
  }[position];

  return rotationClass ? (
    <div className={rotationClass}>
      <PlayerAreaContent />
    </div>
  ) : (
    <PlayerAreaContent />
  );
}