import OpenAI from "openai";

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_OPENROUTER_MODEL = "recursive/flint-v1.0:free";

export const getAiProvider = () => {
  // OpenRouter is the safe default. OpenAI is used only when explicitly selected.
  return process.env.AI_PROVIDER?.trim().toLowerCase() === "openai"
    ? "openai"
    : "openrouter";
};

export const getAiModel = () => {
  if (getAiProvider() === "openai") {
    return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
  }

  const configuredModel = process.env.OPENROUTER_MODEL?.trim();
  if (configuredModel?.endsWith(":free")) {
    return configuredModel;
  }

  if (configuredModel) {
    console.warn(
      `[AI] Ignoring OpenRouter model "${configuredModel}" because free-only mode requires a model ID ending in ":free". Using ${DEFAULT_OPENROUTER_MODEL}.`
    );
  }

  return DEFAULT_OPENROUTER_MODEL;
};

export const getAiClient = () => {
  const provider = getAiProvider();
  const apiKey =
    provider === "openrouter"
      ? process.env.OPENROUTER_API_KEY
      : process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const options = {
    apiKey,
    timeout: Number.parseInt(process.env.OPENAI_TIMEOUT_MS ?? "30000", 10),
    maxRetries: Number.parseInt(process.env.OPENAI_MAX_RETRIES ?? "1", 10),
  };

  if (provider === "openrouter") {
    options.baseURL = "https://openrouter.ai/api/v1";

    if (process.env.OPENROUTER_SITE_URL) {
      options.defaultHeaders = {
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL,
      };
    }

    if (process.env.OPENROUTER_APP_NAME) {
      options.defaultHeaders = {
        ...options.defaultHeaders,
        "X-Title": process.env.OPENROUTER_APP_NAME,
      };
    }
  }

  return new OpenAI(options);
};
