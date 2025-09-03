import { PlayerArea } from "./PlayerArea";
import { CenterArea } from "./CenterArea";

export default function GameBoard() {
  return (
    <div className="w-full h-screen bg-white relative">
      {/* Dotted background pattern */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle, #666 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
      />
      
      {/* Game board container */}
      <div className="relative h-full grid grid-rows-[200px_1fr_200px] grid-cols-[200px_1fr_200px]">
        {/* Top player */}
        <div className="col-start-2 row-start-1 flex items-end justify-center">
          <PlayerArea position="top" />
        </div>
        
        {/* Right player */}
        <div className="col-start-3 row-start-2 flex items-center justify-center">
          <PlayerArea position="right" />
        </div>
        
        {/* Bottom player */}
        <div className="col-start-2 row-start-3 flex items-start justify-center">
          <PlayerArea position="bottom" />
        </div>
        
        {/* Left player */}
        <div className="col-start-1 row-start-2 flex items-center justify-center">
          <PlayerArea position="left" />
        </div>
        
        {/* Center area */}
        <div className="col-start-2 row-start-2 flex items-center justify-center">
          <CenterArea />
        </div>
      </div>
    </div>
  );
}