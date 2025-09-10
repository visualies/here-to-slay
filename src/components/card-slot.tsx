import { cn } from "@/lib/utils";

interface CardSlotProps {
  className?: string;
  children?: React.ReactNode;
  label?: string;
  size?: "small" | "large";
  cardType?: "hero" | "party-leader";
}

export function CardSlot({ className, children, label, size = "small", cardType = "hero" }: CardSlotProps) {
  return (
    <div className={cn("relative", className)}>
      {label && (
        <div className="absolute -top-6 left-0 text-xs text-gray-600 font-medium whitespace-nowrap">
          {label}
        </div>
      )}
      <div 
        className={cn(
          "bg-background border-2 border-gray-300 rounded overflow-visible flex items-center justify-center",
          size === "large" ? "w-24" : "w-20",
          children ? "border-none" : "border-dashed"
        )}
        style={{
          aspectRatio: cardType === "party-leader" ? "7/12" : "744/1039"
        }}
      >
        {children}
      </div>
    </div>
  );
}