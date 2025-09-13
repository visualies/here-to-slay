/**
 * Global In-Memory Action Queue System
 * 
 * Manages multi-step actions (hero effects) that require user input.
 * Each room has its own action queue with pending action chains.
 */

export interface ActionQueueItem {
  type: string;                  // 'steal_hero', 'draw_card', 'attack_monster', etc.
  data?: Record<string, unknown>; // Action-specific parameters
  requiresInput: boolean;        // Does this action need user input?
  completed: boolean;            // Has this action been executed?
}

export interface ActionChain {
  id: string;                    // Unique chain ID
  roomId: string;                // Room this chain belongs to
  playerId: string;              // Player who triggered this chain
  triggerType: 'hero_played' | 'monster_defeated' | 'manual';
  triggerData: Record<string, unknown>; // Original trigger context (hero card, etc.)
  
  actions: ActionQueueItem[];    // Queue of actions to execute
  currentIndex: number;          // Current action being processed
  
  awaitingInput: boolean;        // Is chain paused for user input?
  inputRequired?: UserInputRequest;
  
  createdAt: number;             // Timestamp for cleanup
}

export interface UserInputRequest {
  type: 'select_card' | 'select_player' | 'select_hero' | 'choose_option' | 'dice_roll';
  prompt: string;                // Description for the user
  options?: unknown[];           // Available choices (players, cards, etc.)
  constraints?: Record<string, unknown>; // Additional validation rules
}

export interface ActionChainResult {
  success: boolean;
  chainId?: string;
  message?: string;
  completed?: boolean;           // Is the entire chain finished?
  requiresInput?: UserInputRequest; // Does the current step need user input?
}

/**
 * Global Action Queue Manager
 * Singleton that manages all action chains across all rooms
 */
class ActionQueueManager {
  private chains = new Map<string, ActionChain>(); // chainId -> ActionChain
  private roomChains = new Map<string, Set<string>>(); // roomId -> Set<chainId>
  
  /**
   * Start a new action chain
   */
  startChain(
    roomId: string,
    playerId: string,
    triggerType: ActionChain['triggerType'],
    actions: Omit<ActionQueueItem, 'completed'>[],
    triggerData: Record<string, unknown> = {}
  ): ActionChainResult {
    const chainId = `chain-${roomId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const chain: ActionChain = {
      id: chainId,
      roomId,
      playerId,
      triggerType,
      triggerData,
      actions: actions.map(action => ({ ...action, completed: false })),
      currentIndex: 0,
      awaitingInput: false,
      createdAt: Date.now()
    };

    // Store the chain
    this.chains.set(chainId, chain);
    
    // Track chains per room
    if (!this.roomChains.has(roomId)) {
      this.roomChains.set(roomId, new Set());
    }
    this.roomChains.get(roomId)!.add(chainId);

    console.log(`🎭 Started action chain ${chainId} for player ${playerId} in room ${roomId}`);
    console.log(`🎭 Chain has ${actions.length} actions:`, actions.map(a => a.type));

    // Execute the first action
    return this.executeNextAction(chain);
  }

  /**
   * Continue a paused action chain with user input
   */
  continueChain(chainId: string, userInput: unknown): ActionChainResult {
    const chain = this.chains.get(chainId);
    
    if (!chain) {
      return { success: false, message: 'Action chain not found or expired' };
    }

    if (!chain.awaitingInput) {
      return { success: false, message: 'Chain is not awaiting input' };
    }

    console.log(`🎭 Continuing chain ${chainId} with input:`, userInput);

    // Store the user input in the current action
    const currentAction = chain.actions[chain.currentIndex];
    if (currentAction) {
      currentAction.data = { ...currentAction.data, userInput };
    }

    // Clear the awaiting input state
    chain.awaitingInput = false;
    chain.inputRequired = undefined;

    // Execute the current action with the user input
    return this.executeNextAction(chain);
  }

  /**
   * Execute the next action in the chain
   */
  private executeNextAction(chain: ActionChain): ActionChainResult {
    // Check if chain is complete
    if (chain.currentIndex >= chain.actions.length) {
      console.log(`🎭 Chain ${chain.id} completed`);
      this.cleanupChain(chain.id);
      return { 
        success: true, 
        chainId: chain.id, 
        completed: true,
        message: 'Action chain completed'
      };
    }

    const action = chain.actions[chain.currentIndex];
    console.log(`🎭 Executing action ${chain.currentIndex + 1}/${chain.actions.length}: ${action.type}`);

    // If action requires input and we don't have it yet
    if (action.requiresInput && !action.data?.userInput) {
      console.log(`🎭 Action ${action.type} requires user input`);
      
      // Generate input request based on action type
      const inputRequest = this.generateInputRequest(action, chain);
      
      if (inputRequest) {
        chain.awaitingInput = true;
        chain.inputRequired = inputRequest;
        
        return {
          success: false, // Not failed, just waiting for input
          chainId: chain.id,
          requiresInput: inputRequest
        };
      }
    }

    // Execute the action (this would call internal action services)
    const actionResult = this.executeAction(action, chain);

    if (actionResult.success) {
      // Mark action as completed
      action.completed = true;
      
      // Move to next action
      chain.currentIndex++;
      
      // Recursively execute next action
      return this.executeNextAction(chain);
    } else {
      // Action failed, abort chain
      console.log(`🎭 Action ${action.type} failed:`, actionResult.message);
      this.cleanupChain(chain.id);
      return {
        success: false,
        chainId: chain.id,
        message: actionResult.message || 'Action failed'
      };
    }
  }

  /**
   * Generate input request for an action type
   */
  private generateInputRequest(action: ActionQueueItem, chain: ActionChain): UserInputRequest | null {
    switch (action.type) {
      case 'steal_hero':
        return {
          type: 'select_hero',
          prompt: 'Choose a hero to steal from an opponent',
          options: [], // Would be populated with opponent heroes
          constraints: { excludePlayerId: chain.playerId }
        };

      case 'steal_hand_card':
        return {
          type: 'select_player',
          prompt: 'Choose an opponent to steal a card from',
          options: [], // Would be populated with other players
          constraints: { excludePlayerId: chain.playerId }
        };

      case 'attack_monster':
        return {
          type: 'select_card',
          prompt: 'Choose a monster to attack',
          options: [], // Would be populated with available monsters
          constraints: { cardType: 'Monster' }
        };

      case 'choose_effects':
        return {
          type: 'choose_option',
          prompt: 'Choose which effects to activate',
          options: action.data?.availableEffects as unknown[] || [],
          constraints: { 
            minChoices: 1, 
            maxChoices: action.data?.chooseCount || 1 
          }
        };

      default:
        console.warn(`🎭 No input request generator for action type: ${action.type}`);
        return null;
    }
  }

  /**
   * Execute a single action (integrate with internal action services)
   */
  private executeAction(action: ActionQueueItem, chain: ActionChain): { success: boolean; message?: string } {
    console.log(`🎭 Executing internal action: ${action.type}`);
    
    // This is where we'd integrate with the internal action services
    // For now, just simulate success
    switch (action.type) {
      case 'draw_card':
        console.log(`🎭 Drawing card for player ${chain.playerId}`);
        return { success: true };

      case 'steal_hero':
        const heroTarget = action.data?.userInput as any;
        console.log(`🎭 Stealing hero from player ${heroTarget?.targetPlayerId}`);
        return { success: true };

      case 'attack_monster':
        const monsterTarget = action.data?.userInput as any;
        console.log(`🎭 Attacking monster ${monsterTarget?.monsterId}`);
        return { success: true };

      default:
        console.warn(`🎭 Unknown action type: ${action.type}`);
        return { success: false, message: `Unknown action type: ${action.type}` };
    }
  }

  /**
   * Get all pending chains for a room
   */
  getRoomChains(roomId: string): ActionChain[] {
    const chainIds = this.roomChains.get(roomId) || new Set();
    return Array.from(chainIds)
      .map(chainId => this.chains.get(chainId))
      .filter((chain): chain is ActionChain => chain !== undefined);
  }

  /**
   * Get all pending chains for a specific player
   */
  getPlayerChains(roomId: string, playerId: string): ActionChain[] {
    return this.getRoomChains(roomId).filter(chain => chain.playerId === playerId);
  }

  /**
   * Clean up a specific chain
   */
  private cleanupChain(chainId: string): void {
    const chain = this.chains.get(chainId);
    if (chain) {
      // Remove from room tracking
      const roomChainSet = this.roomChains.get(chain.roomId);
      if (roomChainSet) {
        roomChainSet.delete(chainId);
        if (roomChainSet.size === 0) {
          this.roomChains.delete(chain.roomId);
        }
      }
      
      // Remove the chain
      this.chains.delete(chainId);
      console.log(`🎭 Cleaned up chain ${chainId}`);
    }
  }

  /**
   * Clean up all chains for a room (when room closes)
   */
  cleanupRoom(roomId: string): void {
    const chainIds = this.roomChains.get(roomId) || new Set();
    chainIds.forEach(chainId => {
      this.chains.delete(chainId);
    });
    this.roomChains.delete(roomId);
    console.log(`🎭 Cleaned up ${chainIds.size} chains for room ${roomId}`);
  }

  /**
   * Clean up expired chains (older than 5 minutes)
   */
  cleanupExpired(): void {
    const now = Date.now();
    const expiredThreshold = 5 * 60 * 1000; // 5 minutes

    const expiredChains: string[] = [];
    
    this.chains.forEach((chain, chainId) => {
      if (now - chain.createdAt > expiredThreshold) {
        expiredChains.push(chainId);
      }
    });

    expiredChains.forEach(chainId => this.cleanupChain(chainId));
    
    if (expiredChains.length > 0) {
      console.log(`🎭 Cleaned up ${expiredChains.length} expired chains`);
    }
  }

  /**
   * Get debug info for all chains
   */
  getDebugInfo(): Record<string, unknown> {
    return {
      totalChains: this.chains.size,
      roomsWithChains: this.roomChains.size,
      chains: Array.from(this.chains.values()).map(chain => ({
        id: chain.id,
        roomId: chain.roomId,
        playerId: chain.playerId,
        triggerType: chain.triggerType,
        totalActions: chain.actions.length,
        currentIndex: chain.currentIndex,
        awaitingInput: chain.awaitingInput,
        createdAt: new Date(chain.createdAt).toISOString()
      }))
    };
  }
}

// Global singleton instance
export const actionQueue = new ActionQueueManager();

// Auto-cleanup expired chains every minute
setInterval(() => {
  actionQueue.cleanupExpired();
}, 60 * 1000);