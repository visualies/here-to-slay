"use client";

import { useState, useEffect } from "react";
import { ServerDiceStates } from "../lib/server-dice";

interface DebugPanelProps {
  roomId: string;
  serverDiceStates: ServerDiceStates;
  clientDiceStates: { [diceId: string]: { position?: number[] } | null };
  isConnected: boolean;
  lastUpdate: number;
}

export function DebugPanel({ 
  roomId, 
  serverDiceStates, 
  clientDiceStates, 
  isConnected, 
  lastUpdate 
}: DebugPanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const timeSinceLastUpdate = lastUpdate ? currentTime - lastUpdate : 0;

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
      >
        {isVisible ? "Hide Debug" : "Show Debug"}
      </button>

      {/* Debug panel */}
      {isVisible && (
        <div className="fixed top-16 right-4 z-50 bg-black bg-opacity-90 text-white p-4 rounded-lg max-w-md max-h-96 overflow-auto text-xs font-mono">
          <h3 className="text-yellow-400 font-bold mb-2">🎲 Dice Debug Panel</h3>
          
          {/* Connection Status */}
          <div className="mb-3">
            <div className="text-green-400">Room: {roomId}</div>
            <div className={isConnected ? "text-green-400" : "text-red-400"}>
              WebSocket: {isConnected ? "Connected" : "Disconnected"}
            </div>
            <div className="text-blue-400">
              Last Update: {lastUpdate === 0 ? "Never" : timeSinceLastUpdate < 1000 ? `${timeSinceLastUpdate}ms ago` : `${Math.floor(timeSinceLastUpdate / 1000)}s ago`}
            </div>
            <div className="text-yellow-400">
              Server States Count: {Object.keys(serverDiceStates).length}
            </div>
          </div>

          {/* Server Dice States */}
          <div className="mb-3">
            <h4 className="text-yellow-400 font-bold">Server States:</h4>
            {Object.keys(serverDiceStates).length === 0 ? (
              <div className="text-red-400">No server states received</div>
            ) : (
              Object.entries(serverDiceStates).map(([diceId, state]) => (
                <div key={diceId} className="ml-2 mb-1">
                  <div className="text-cyan-400">{diceId}:</div>
                  <div className="ml-2 text-gray-300">
                    Pos: [{state.position?.map((p: number) => p.toFixed(2)).join(", ")}]
                  </div>
                  <div className="ml-2 text-gray-300">
                    Result: {state.result} | Stable: {state.isStable ? "Yes" : "No"}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Client Dice States */}
          <div className="mb-3">
            <h4 className="text-yellow-400 font-bold">Client States:</h4>
            {Object.keys(clientDiceStates).length === 0 ? (
              <div className="text-red-400">No client states</div>
            ) : (
              Object.entries(clientDiceStates).map(([diceId, state]) => (
                <div key={diceId} className="ml-2 mb-1">
                  <div className="text-cyan-400">{diceId}:</div>
                  <div className="ml-2 text-gray-300">
                    {state ? `Pos: [${state.position?.map((p: number) => p.toFixed(2)).join(", ")}]` : "No state"}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sync Status */}
          <div>
            <h4 className="text-yellow-400 font-bold">Sync Status:</h4>
            {Object.keys(serverDiceStates).map((diceId) => {
              const serverState = serverDiceStates[diceId];
              const clientState = clientDiceStates[diceId];
              const isInSync = serverState && clientState && clientState.position &&
                Math.abs(serverState.position[0] - clientState.position[0]) < 0.01 &&
                Math.abs(serverState.position[1] - clientState.position[1]) < 0.01 &&
                Math.abs(serverState.position[2] - clientState.position[2]) < 0.01;
              
              return (
                <div key={diceId} className="ml-2">
                  <span className="text-cyan-400">{diceId}:</span>
                  <span className={isInSync ? "text-green-400" : "text-red-400"}>
                    {isInSync ? " ✅ In Sync" : " ❌ Out of Sync"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
