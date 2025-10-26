// tools.js
// A tiny tool registry + helpers to expose specs in the shape each provider expects.

export const TOOL_REGISTRY = new Map(); // name -> { description, parameters (JSON Schema), handler }

/** Register a tool */
export function registerTool({ name, description, parameters }, handler) {
  if (!name) throw new Error("Tool must have a name");
  TOOL_REGISTRY.set(name, { name, description, parameters, handler });
}

/** Dispatch (no branching jungle) */
export async function dispatch(toolName, args) {
  const spec = TOOL_REGISTRY.get(toolName);
  if (!spec) return { error: `Unknown tool: ${toolName}` };
  try {
    return await spec.handler(args || {});
  } catch (err) {
    return { error: String(err?.message || err) };
  }
}

/** OpenAI: tools = [{ type:'function', function:{ name, description, parameters }}] */
export function listToolsForOpenAI() {
  return [...TOOL_REGISTRY.values()].map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

/** Gemini: tools = [{ functionDeclarations: [{ name, description, parameters }] }] */
export function listToolsForGemini() {
  return [
    {
      functionDeclarations: [...TOOL_REGISTRY.values()].map((t) => ({
        name: t.name,
        description: t.description,
        // Gemini accepts JSON Schema-ish shapes for parameters
        parameters: t.parameters,
      })),
    },
  ];
}
