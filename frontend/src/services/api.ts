import axios from "axios";
import type {
  Application,
  ApplicationPayload,
  AuthResponse,
  Credentials,
  ParsedJobDetails,
  ResumeSuggestionRequest,
  User,
} from "../types/job-tracker";

export const TOKEN_STORAGE_KEY = "job-tracker-token";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const getErrorMessage = (
  error: unknown,
  fallback = "Something went wrong."
) => {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

export const authApi = {
  login: async (credentials: Credentials) => {
    const response = await API.post<AuthResponse>("/auth/login", credentials);
    return response.data;
  },
  register: async (credentials: Credentials) => {
    const response = await API.post<AuthResponse>("/auth/register", credentials);
    return response.data;
  },
  me: async () => {
    const response = await API.get<{ user: User }>("/auth/me");
    return response.data.user;
  },
};

export const applicationsApi = {
  list: async () => {
    const response = await API.get<{ applications: Application[] }>("/applications");
    return response.data.applications;
  },
  create: async (payload: ApplicationPayload) => {
    const response = await API.post<{ application: Application }>(
      "/applications",
      payload
    );
    return response.data.application;
  },
  update: async (id: string, payload: ApplicationPayload) => {
    const response = await API.patch<{ application: Application }>(
      `/applications/${id}`,
      payload
    );
    return response.data.application;
  },
  updateStatus: async (id: string, status: Application["status"]) => {
    const response = await API.patch<{ application: Application }>(
      `/applications/${id}/status`,
      { status }
    );
    return response.data.application;
  },
  remove: async (id: string) => {
    await API.delete(`/applications/${id}`);
  },
};

export const aiApi = {
  parseJobDescription: async (jdText: string) => {
    const response = await API.post<{ parsed: ParsedJobDetails }>("/ai/parse", {
      jdText,
    });

    return response.data.parsed;
  },
  generateResumeSuggestions: async (payload: ResumeSuggestionRequest) => {
    const response = await API.post<{ suggestions: string[] }>(
      "/ai/suggestions",
      payload
    );

    return response.data.suggestions;
  },
  generateResumeSuggestionsStream: async (
    payload: ResumeSuggestionRequest,
    onChunk: (chunk: string) => void
  ) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api"}/ai/suggestions/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok || !response.body) {
      throw new Error("Suggestion streaming failed.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalSuggestions: string[] = [];

    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) {
          continue;
        }

        const parsed = JSON.parse(line) as
          | { type: "chunk"; content: string }
          | { type: "done"; suggestions: string[] };

        if (parsed.type === "chunk") {
          onChunk(parsed.content);
        } else {
          finalSuggestions = parsed.suggestions;
        }
      }
    }

    if (buffer.trim()) {
      const parsed = JSON.parse(buffer) as { type: "done"; suggestions: string[] };
      finalSuggestions = parsed.suggestions;
    }

    return finalSuggestions;
  },
};

export default API;
