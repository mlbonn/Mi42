import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type LLMProvider = "openai" | "anthropic" | "google" | "mistral" | "groq";

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  provider?: LLMProvider;
  apiKey?: string;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

// Provider-specific configurations
const PROVIDER_CONFIGS: Record<LLMProvider, { baseUrl: string; model: string }> = {
  openai: {
    baseUrl: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
  },
  anthropic: {
    baseUrl: "https://api.anthropic.com/v1/messages",
    model: "claude-3-5-sonnet-20241022",
  },
  google: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    model: "gemini-2.0-flash",
  },
  mistral: {
    baseUrl: "https://api.mistral.ai/v1/chat/completions",
    model: "mistral-large-latest",
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
  },
};

const resolveApiUrl = (provider?: LLMProvider) => {
  // If using Forge API (default)
  if (ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0) {
    return `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`;
  }
  
  // If using direct provider API
  if (provider && PROVIDER_CONFIGS[provider]) {
    return PROVIDER_CONFIGS[provider].baseUrl;
  }
  
  // Default to Forge
  return "https://forge.manus.im/v1/chat/completions";
};

const resolveModel = (provider?: LLMProvider) => {
  if (provider && PROVIDER_CONFIGS[provider]) {
    return PROVIDER_CONFIGS[provider].model;
  }
  return "gemini-2.5-flash";
};

const resolveApiKey = (provider?: LLMProvider, customApiKey?: string) => {
  // Priority: custom API key > provider-specific key > forge key
  if (customApiKey) {
    return customApiKey;
  }
  if (ENV.forgeApiKey) {
    return ENV.forgeApiKey;
  }
  return null;
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    provider,
    apiKey: customApiKey,
  } = params;

  const apiKey = resolveApiKey(provider, customApiKey);
  
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured. Please add an API key in Settings > API.");
  }

  const payload: Record<string, unknown> = {
    model: resolveModel(provider),
    messages: messages.map(normalizeMessage),
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  payload.max_tokens = 8192;
  
  // Only add thinking for Gemini models (via Forge)
  if (!provider || provider === 'google') {
    // Skip thinking parameter for direct API calls
  }

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const response = await fetch(resolveApiUrl(provider), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as InvokeResult;
}

// ============================================================================
// DATABASE-AWARE LLM INVOCATION
// ============================================================================

import { getDb } from "../db";
import { apiKeys } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Cache for API keys to avoid repeated DB queries
let apiKeyCache: {
  keys: Record<string, string>;
  defaultProvider: LLMProvider;
  timestamp: number;
} | null = null;

const CACHE_TTL = 60000; // 1 minute

async function getApiKeysFromDb(): Promise<{
  keys: Record<string, string>;
  defaultProvider: LLMProvider;
}> {
  // Check cache
  if (apiKeyCache && Date.now() - apiKeyCache.timestamp < CACHE_TTL) {
    return { keys: apiKeyCache.keys, defaultProvider: apiKeyCache.defaultProvider };
  }

  const db = await getDb();
  if (!db) {
    return { keys: {}, defaultProvider: "openai" };
  }

  // Get all API keys and find the first one with an OpenAI key
  const result = await db.select().from(apiKeys);
  
  if (result.length === 0) {
    return { keys: {}, defaultProvider: "openai" };
  }

  // Find the first row that has at least one LLM key configured
  let row = result.find(r => 
    r.openaiKey || r.anthropicKey || r.googleKey || r.mistralKey || r.groqKey
  );
  
  // If no row with keys found, use the first row
  if (!row) {
    row = result[0];
  }
  const keys: Record<string, string> = {
    openai: row.openaiKey || "",
    anthropic: row.anthropicKey || "",
    google: row.googleKey || "",
    mistral: row.mistralKey || "",
    groq: row.groqKey || "",
  };

  const defaultProvider = (row.defaultLlmProvider as LLMProvider) || "openai";

  // Update cache
  apiKeyCache = {
    keys,
    defaultProvider,
    timestamp: Date.now(),
  };

  return { keys, defaultProvider };
}

/**
 * Invoke LLM with automatic API key resolution from database
 * This is the preferred method for Discovery and other services
 */
export async function invokeLLMWithDbKeys(
  params: Omit<InvokeParams, "apiKey" | "provider">
): Promise<InvokeResult> {
  const { keys, defaultProvider } = await getApiKeysFromDb();
  
  // Try default provider first
  let apiKey = keys[defaultProvider];
  let provider: LLMProvider = defaultProvider;
  
  // If default provider has no key, try others
  if (!apiKey) {
    const providers: LLMProvider[] = ["openai", "google", "anthropic", "mistral", "groq"];
    for (const p of providers) {
      if (keys[p]) {
        apiKey = keys[p];
        provider = p;
        break;
      }
    }
  }
  
  // Fallback to ENV if no DB keys
  if (!apiKey && ENV.forgeApiKey) {
    apiKey = ENV.forgeApiKey;
    provider = "openai"; // Forge uses OpenAI-compatible API
  }
  
  if (!apiKey) {
    throw new Error(
      "No LLM API key configured. Please add an API key in Settings > API Keys."
    );
  }

  return invokeLLM({
    ...params,
    provider,
    apiKey,
  });
}

// Clear cache (useful for testing or when keys are updated)
export function clearApiKeyCache() {
  apiKeyCache = null;
}
