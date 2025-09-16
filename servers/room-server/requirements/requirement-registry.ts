import type { ActionContext, ActionResult } from '../../../shared/types';

export interface RequirementHandler {
  run: (context: ActionContext, ...args: unknown[]) => ActionResult;
}

class RequirementRegistry {
  private requirements = new Map<string, RequirementHandler>();

  register(name: string, handler: RequirementHandler) {
    this.requirements.set(name, handler);
  }

  get(name: string): RequirementHandler | undefined {
    return this.requirements.get(name);
  }

  getAll(): Map<string, RequirementHandler> {
    return new Map(this.requirements);
  }
}

export const requirementRegistry = new RequirementRegistry();

export function registerRequirement(name: string, handler: RequirementHandler) {
  requirementRegistry.register(name, handler);
}