import type { SideEffectLevel, ToolContext } from "./agentTypes";

export function assertToolAllowed(
  ctx: ToolContext,
  requiredLevel: SideEffectLevel,
  permission: string
) {
  if (requiredLevel > ctx.maxSideEffectLevel) {
    throw new Error(
      `Tool side-effect level ${requiredLevel} exceeds max ${ctx.maxSideEffectLevel}`
    );
  }

  if (!ctx.permissions.includes(permission)) {
    throw new Error(`Missing permission: ${permission}`);
  }
}
