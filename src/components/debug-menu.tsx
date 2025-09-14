"use client";

import React, { useState, useEffect } from 'react';
import { useRoom } from '../contexts/room-context';
import { Button } from './ui/button';
import { X, Bug, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

interface DebugMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

interface YjsState {
  gameState?: Record<string, unknown>;
  players?: Record<string, unknown>;
  metadata?: {
    connectionStatus: string;
    roomId: string | null;
    playerCount: number;
    isHost: boolean;
  };
}

export function DebugMenu({ isOpen, onClose }: DebugMenuProps) {
  const room = useRoom();
  const [yjsState, setYjsState] = useState<YjsState>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['gameState', 'players']));
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const updateYjsState = () => {
      const state: YjsState = {};

      // Get game state from room context
      state.gameState = {
        gamePhase: room.gamePhase,
        currentTurn: room.currentTurn,
        supportStack: room.supportStack,
        monsters: room.monsters,
      };

      // Get players from room context
      state.players = {};
      room.players.forEach((player, index) => {
        state.players![`player_${index}`] = player;
      });

      // Add room metadata
      state.metadata = {
        connectionStatus: room.isConnected ? 'connected' : 'disconnected',
        roomId: room.roomId,
        playerCount: room.players.length,
        isHost: room.isHost
      };

      setYjsState(state);
    };

    // Initial update
    updateYjsState();

    // Set up interval for periodic updates
    const interval = setInterval(updateYjsState, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isOpen, room.gamePhase, room.currentTurn, room.supportStack, room.monsters, room.players, room.isConnected, room.roomId, room.isHost]);


  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const toggleItem = (itemKey: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemKey)) {
      newExpanded.delete(itemKey);
    } else {
      newExpanded.add(itemKey);
    }
    setExpandedItems(newExpanded);
  };

  const copyToClipboard = async (text: string, itemKey: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(itemKey);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const renderValue = (value: unknown, key: string = '', depth: number = 0): React.ReactElement => {
    const itemKey = `${key}_${depth}`;
    const isExpanded = expandedItems.has(itemKey);

    if (value === null) return <span className="text-gray-500">null</span>;
    if (value === undefined) return <span className="text-gray-500">undefined</span>;
    if (typeof value === 'boolean') return <span className="text-blue-400">{value.toString()}</span>;
    if (typeof value === 'number') return <span className="text-green-400">{value}</span>;
    if (typeof value === 'string') return <span className="text-yellow-400">&quot;{value}&quot;</span>;

    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-gray-500">[]</span>;

      return (
        <div>
          <span className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleItem(itemKey)}
              className="p-0 h-auto text-gray-400 hover:text-white min-w-0"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </Button>
            <span className="text-gray-300">[{value.length}]</span>
          </span>
          {isExpanded && (
            <div className="ml-4 mt-1">
              {value.map((item, index) => (
                <div key={index} className="py-1">
                  <span className="text-gray-500">{index}: </span>
                  {renderValue(item, `${key}.${index}`, depth + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (typeof value === 'object' && value !== null) {
      const entries = Object.entries(value);
      if (entries.length === 0) return <span className="text-gray-500">{"{}"}</span>;

      return (
        <div>
          <span className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleItem(itemKey)}
              className="p-0 h-auto text-gray-400 hover:text-white min-w-0"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </Button>
            <span className="text-gray-300">{"{" + entries.length + "}"}</span>
          </span>
          {isExpanded && (
            <div className="ml-4 mt-1">
              {entries.map(([objKey, objValue]) => (
                <div key={objKey} className="py-1">
                  <span className="text-blue-300">&quot;{objKey}&quot;</span>
                  <span className="text-gray-500">: </span>
                  {renderValue(objValue, `${key}.${objKey}`, depth + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return <span className="text-gray-400">{String(value)}</span>;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Yjs Document State Debug</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="font-mono text-sm">
            {Object.entries(yjsState).map(([section, data]) => (
              <div key={section} className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSection(section)}
                    className="p-1 h-auto text-white hover:bg-gray-800"
                  >
                    {expandedSections.has(section) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </Button>
                  <span className="text-cyan-400 font-semibold text-base">{section}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(data, null, 2), section)}
                    className="p-1 h-auto ml-auto text-gray-400 hover:text-white"
                  >
                    {copiedItem === section ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
                {expandedSections.has(section) && (
                  <div className="ml-6 pl-4 border-l border-gray-700">
                    {renderValue(data, section)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 text-xs text-gray-400">
          <p>Real-time Yjs document state • Updates automatically when document changes</p>
        </div>
      </div>
    </div>
  );
}