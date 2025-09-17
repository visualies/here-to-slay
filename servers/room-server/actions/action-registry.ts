import type { ActionContext, ActionResult, ActionParams } from '../../../shared/types';

export interface ActionHandler {
  run: (context: ActionContext, params?: ActionParams) => ActionResult;
  callback?: (context: ActionContext, userInput: any) => ActionResult;
}

class ActionRegistry {
  private actions = new Map<string, ActionHandler>();

  register(name: string, handler: ActionHandler) {
    this.actions.set(name, handler);
  }

  get(name: string): ActionHandler | undefined {
    return this.actions.get(name);
  }

  getAll(): Map<string, ActionHandler> {
    return new Map(this.actions);
  }

  listActions(): string[] {
    return Array.from(this.actions.keys());
  }
}

export const actionRegistry = new ActionRegistry();

export function registerAction(name: string, handler: ActionHandler) {
  actionRegistry.register(name, handler);
}