import type { ActionContext, ActionResult } from './action-service';

export interface ActionHandler {
  run: (context: ActionContext, ...args: unknown[]) => ActionResult;
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
}

export const actionRegistry = new ActionRegistry();

export function registerAction(name: string, handler: ActionHandler) {
  actionRegistry.register(name, handler);
}