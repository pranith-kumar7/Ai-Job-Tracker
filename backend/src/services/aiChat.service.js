import mongoose from "mongoose";
import OpenAI from "openai";
import { AiChat } from "../models/aiChat.model.js";
import { AI_CHAT_SYSTEM_PROMPT } from "./ai.prompts.js";

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: Number.parseInt(process.env.OPENAI_TIMEOUT_MS ?? "30000", 10),
    maxRetries: Number.parseInt(process.env.OPENAI_MAX_RETRIES ?? "1", 10),
  });
};

const getOpenAIModel = () => process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL;

const makeTitle = (message) => {
  const title = String(message).trim().slice(0, 60);
  return title || "New AI chat";
};

const toObjectId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    return null;
  }

  return new mongoose.Types.ObjectId(id);
};

const fallbackChatResponse = (message) =>
  [
    "Here is a practical way to approach this:",
    "",
    `- Clarify the target role or job description.`,
    `- Identify the strongest matching skills in your resume.`,
    `- Turn responsibilities into measurable achievements.`,
    `- Prepare one concrete example you can discuss in interviews.`,
    "",
    `Your message: ${message}`,
  ].join("\n");

const callChatModel = async (messages, onUsage) => {
  const client = getOpenAIClient();

  if (!client) {
    await onUsage?.({
      feature: "ai_chat",
      provider: "fallback",
      model: getOpenAIModel(),
      status: "fallback",
    });
    return fallbackChatResponse(messages.at(-1)?.content);
  }

  try {
    const completion = await client.chat.completions.create({
      model: getOpenAIModel(),
      messages: [
        { role: "system", content: AI_CHAT_SYSTEM_PROMPT },
        ...messages.map((item) => ({
          role: item.role,
          content: item.content,
        })),
      ],
    });

    await onUsage?.({
      feature: "ai_chat",
      provider: "openai",
      model: getOpenAIModel(),
      status: "success",
      usage: completion.usage,
    });

    return completion.choices[0]?.message?.content?.trim() || fallbackChatResponse(messages.at(-1)?.content);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn(`[AI] chat failed; using fallback. ${message}`);
    await onUsage?.({
      feature: "ai_chat",
      provider: "openai",
      model: getOpenAIModel(),
      status: "fallback",
      errorMessage: message,
    });
    return fallbackChatResponse(messages.at(-1)?.content);
  }
};

export const listChats = async (userId) =>
  AiChat.find({ userId })
    .sort({ updatedAt: -1 })
    .select("_id title updatedAt createdAt messages")
    .lean();

export const getChat = async (userId, chatId) => {
  const objectChatId = toObjectId(chatId);

  if (!objectChatId) {
    return null;
  }

  return AiChat.findOne({ _id: objectChatId, userId }).lean();
};

export const sendChatMessage = async ({ userId, chatId, message, onUsage }) => {
  const trimmedMessage = String(message).trim();
  let chat = null;

  if (chatId) {
    const objectChatId = toObjectId(chatId);
    if (objectChatId) {
      chat = await AiChat.findOne({ _id: objectChatId, userId });
    }
  }

  if (!chat) {
    chat = await AiChat.create({
      userId,
      title: makeTitle(trimmedMessage),
      messages: [],
    });
  }

  chat.messages.push({ role: "user", content: trimmedMessage });
  const assistantContent = await callChatModel(chat.messages, onUsage);
  chat.messages.push({ role: "assistant", content: assistantContent });
  await chat.save();

  return chat.toObject();
};

export const regenerateLastResponse = async ({ userId, chatId, onUsage }) => {
  const objectChatId = toObjectId(chatId);

  if (!objectChatId) {
    return null;
  }

  const chat = await AiChat.findOne({ _id: objectChatId, userId });

  if (!chat) {
    return null;
  }

  if (chat.messages.at(-1)?.role === "assistant") {
    chat.messages.pop();
  }

  const assistantContent = await callChatModel(chat.messages, onUsage);
  chat.messages.push({ role: "assistant", content: assistantContent });
  await chat.save();

  return chat.toObject();
};

export const clearChat = async (userId, chatId) => {
  const objectChatId = toObjectId(chatId);

  if (!objectChatId) {
    return null;
  }

  return AiChat.findOneAndUpdate(
    { _id: objectChatId, userId },
    { messages: [] },
    { new: true }
  ).lean();
};
