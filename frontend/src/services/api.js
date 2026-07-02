import axios from "axios";

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

export const getErrorMessage = (error, fallback = "Something went wrong.") => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

export const authApi = {
  login: async (credentials) => {
    const response = await API.post("/auth/login", credentials);
    return response.data;
  },
  register: async (credentials) => {
    const response = await API.post("/auth/register", credentials);
    return response.data;
  },
  me: async () => {
    const response = await API.get("/auth/me");
    return response.data.user;
  },
};

export const applicationsApi = {
  list: async () => {
    const response = await API.get("/applications");
    return response.data.applications;
  },
  create: async (payload) => {
    const response = await API.post("/applications", payload);
    return response.data.application;
  },
  update: async (id, payload) => {
    const response = await API.patch(`/applications/${id}`, payload);
    return response.data.application;
  },
  updateStatus: async (id, status) => {
    const response = await API.patch(`/applications/${id}/status`, { status });
    return response.data.application;
  },
  remove: async (id) => {
    await API.delete(`/applications/${id}`);
  },
};

export const aiApi = {
  getUsageSummary: async () => {
    const response = await API.get("/ai/usage");
    return response.data.summary;
  },
  parseJobDescription: async (jdText) => {
    const response = await API.post("/ai/parse", {
      jdText,
    });

    return response.data.parsed;
  },
  generateResumeSuggestions: async (payload) => {
    const response = await API.post("/ai/suggestions", payload);

    return response.data.suggestions;
  },
  generateResumeSuggestionsStream: async (payload, onChunk) => {
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
    let finalSuggestions = [];

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

        const parsed = JSON.parse(line);

        if (parsed.type === "chunk") {
          onChunk(parsed.content);
        } else {
          finalSuggestions = parsed.suggestions;
        }
      }
    }

    if (buffer.trim()) {
      const parsed = JSON.parse(buffer);
      finalSuggestions = parsed.suggestions;
    }

    return finalSuggestions;
  },
  analyzeResume: async (payload) => {
    const response = await API.post("/ai/resume/analyze", toResumeFormData(payload));
    return response.data.analysis;
  },
  matchResume: async (payload) => {
    const response = await API.post("/ai/resume/match", toResumeFormData(payload));
    return response.data.match;
  },
  optimizeResume: async (payload) => {
    const response = await API.post("/ai/resume/optimize", toResumeFormData(payload));
    return response.data.optimization;
  },
  generateCoverLetters: async (payload) => {
    const response = await API.post("/ai/cover-letter", toResumeFormData(payload));
    return response.data.coverLetters;
  },
  generateInterviewPrep: async (payload) => {
    const response = await API.post("/ai/interview/prep", toResumeFormData(payload));
    return response.data.interviewPrep;
  },
  evaluateInterviewAnswer: async (payload) => {
    const response = await API.post("/ai/interview/evaluate", payload);
    return response.data.evaluation;
  },
  listChats: async () => {
    const response = await API.get("/ai/chat");
    return response.data.conversations;
  },
  getChat: async (id) => {
    const response = await API.get(`/ai/chat/${id}`);
    return response.data.conversation;
  },
  sendChatMessage: async ({ conversationId, message }) => {
    const response = await API.post("/ai/chat", { conversationId, message });
    return response.data.conversation;
  },
  regenerateChatResponse: async (id) => {
    const response = await API.post(`/ai/chat/${id}/regenerate`);
    return response.data.conversation;
  },
  clearChat: async (id) => {
    const response = await API.delete(`/ai/chat/${id}/messages`);
    return response.data.conversation;
  },
  analyzeJobAgent: async (payload) => {
    const response = await API.post(
      "/ai/agent/analyze-job",
      toResumeFormData(payload)
    );
    return response.data.agentResult;
  },
};

const toResumeFormData = (payload) => {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    formData.append(key, value);
  });

  return formData;
};

export default API;
