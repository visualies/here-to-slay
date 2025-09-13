"use client";

import { useState, useEffect } from 'react';
import { useRoom } from '../contexts/room-context';
import { Button } from './ui/button';
import { X, Bug, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import * as Y from 'yjs';

interface DebugMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DebugMenu({ isOpen, onClose }: DebugMenuProps) {
  const room = useRoom();
  const [yjsState, setYjsState] = useState<any>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['gameState', 'players']));
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !room.doc) return;

    const updateYjsState = () => {
      const state: any = {};

      // Get all root-level maps from the Yjs document
      const gameState = room.doc?.getMap('gameState');
      const players = room.doc?.getMap('players');

      // Convert Yjs maps to plain objects for display
      if (gameState) {
        state.gameState = {};
        gameState.forEach((value, key) => {
          state.gameState[key] = convertYjsValue(value);
        });
      }

      if (players) {
        state.players = {};
        players.forEach((value, key) => {
          state.players[key] = convertYjsValue(value);
        });
      }

      // Add document metadata
      state.metadata = {
        clientId: room.doc?.clientID,
        guid: room.doc?.guid,
        connectionStatus: room.isConnected ? 'connected' : 'disconnected',
        roomId: room.roomId
      };

      setYjsState(state);
    };

    // Initial update
    updateYjsState();

    // Set up observers for real-time updates
    const observers: (() => void)[] = [];

    if (room.gameStateRef) {
      const gameStateObserver = () => updateYjsState();
      room.gameStateRef.observe(gameStateObserver);
      observers.push(() => room.gameStateRef?.unobserve(gameStateObserver));
    }

    if (room.playersRef) {
      const playersObserver = () => updateYjsState();
      room.playersRef.observe(playersObserver);
      observers.push(() => room.playersRef?.unobserve(playersObserver));
    }

    return () => {
      observers.forEach(cleanup => cleanup());
    };
  }, [isOpen, room.doc, room.gameStateRef, room.playersRef, room.isConnected, room.roomId]);

  const convertYjsValue = (value: any): any => {
    if (value instanceof Y.Map) {
      const obj: any = {};
      value.forEach((v, k) => {
        obj[k] = convertYjsValue(v);
      });
      return obj;
    } else if (value instanceof Y.Array) {
      return value.toArray().map(convertYjsValue);
    } else if (value && typeof value === 'object') {
      return JSON.parse(JSON.stringify(value));
    }
    return value;
  };

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

  const renderValue = (value: any, key: string = '', depth: number = 0): JSX.Element => {
    const itemKey = `${key}_${depth}`;
    const isExpanded = expandedItems.has(itemKey);

    if (value === null) return <span className="text-gray-500">null</span>;
    if (value === undefined) return <span className="text-gray-500">undefined</span>;
    if (typeof value === 'boolean') return <span className="text-blue-400">{value.toString()}</span>;
    if (typeof value === 'number') return <span className="text-green-400">{value}</span>;
    if (typeof value === 'string') return <span className="text-yellow-400">"{value}"</span>;

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
                  <span className="text-blue-300">"{objKey}"</span>
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