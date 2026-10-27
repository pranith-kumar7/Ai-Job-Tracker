import OpenAI from "openai";

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_OPENROUTER_MODEL = "recursive/flint-v1.0:free";
const FREE_ONLY_ENABLED = () =>
  process.env.AI_FREE_ONLY?.trim().toLowerCase() !== "false";

export const getAiProvider = () => {
  // Default to OpenRouter free models so a missing provider setting cannot
  // silently route requests to a paid OpenAI model.
  if (FREE_ONLY_ENABLED()) {
    return "openrouter";
  }

  return process.env.AI_PROVIDER?.trim().toLowerCase() === "openrouter"
    ? "openrouter"
    : "openai";
};

export const getAiModel = () => {
  if (getAiProvider() === "openrouter") {
    const configuredModel = process.env.OPENROUTER_MODEL?.trim();

    // Never send a non-free OpenRouter model while free-only mode is enabled.
    if (FREE_ONLY_ENABLED()) {
      return configuredModel?.endsWith(":free")
        ? configuredModel
        : DEFAULT_OPENROUTER_MODEL;
    }

    return configuredModel || DEFAULT_OPENROUTER_MODEL;
  }

  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
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
