"use client";

import { useRoom } from '../contexts/room-context';

/**
 * Test component to verify read-only Yjs enforcement
 * Only shows in development mode
 */
export function ReadOnlyTest() {
  const room = useRoom();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const testMutation = () => {
    if (!room) return;

    try {
      // This should throw an error if read-only mode is enabled
      const playersMap = room.playersRef?.current;
      if (playersMap) {
        console.log('🧪 Testing client-side mutation...');
        (playersMap as any).set('test-player', { id: 'test', name: 'Test' });
        console.log('⚠️ Mutation succeeded - read-only mode is OFF');
      }
    } catch (error) {
      console.log('✅ Mutation blocked - read-only mode is ON');
      console.error(error);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 bg-yellow-100 border border-yellow-400 p-2 rounded text-xs">
      <div className="font-bold">Development Mode</div>
      <button
        onClick={testMutation}
        className="bg-yellow-500 text-white px-2 py-1 rounded mt-1 text-xs"
      >
        Test Mutation Block
      </button>
      <div className="text-xs mt-1">
        Read-only mode is always enabled
      </div>
    </div>
  );
}