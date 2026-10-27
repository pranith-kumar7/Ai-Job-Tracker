import OpenAI from "openai";

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_OPENROUTER_MODEL = "openai/gpt-4o-mini";

export const getAiProvider = () =>
  process.env.AI_PROVIDER?.trim().toLowerCase() === "openrouter"
    ? "openrouter"
    : "openai";

export const getAiModel = () =>
  getAiProvider() === "openrouter"
    ? process.env.OPENROUTER_MODEL ?? DEFAULT_OPENROUTER_MODEL
    : process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL;

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
