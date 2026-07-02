import mongoose from "mongoose";
import { AiUsage } from "../models/aiUsage.model.js";

const DEFAULT_INPUT_COST_PER_1M = 0.15;
const DEFAULT_OUTPUT_COST_PER_1M = 0.6;

const getNumberEnv = (key, fallback) => {
  const value = Number.parseFloat(process.env[key] ?? "");

  if (!Number.isFinite(value) || value < 0) {
    return fallback;
  }

  return value;
};

const toTokenCount = (value) => {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.round(value);
};

const sanitizeErrorMessage = (value) => {
  if (!value) {
    return undefined;
  }

  return String(value).slice(0, 300);
};

const toObjectId = (userId) => {
  if (!mongoose.isValidObjectId(userId)) {
    return null;
  }

  return new mongoose.Types.ObjectId(userId);
};

export const estimateAiCostUsd = ({
  promptTokens = 0,
  completionTokens = 0,
} = {}) => {
  const inputCostPer1M = getNumberEnv(
    "OPENAI_INPUT_COST_PER_1M",
    DEFAULT_INPUT_COST_PER_1M
  );
  const outputCostPer1M = getNumberEnv(
    "OPENAI_OUTPUT_COST_PER_1M",
    DEFAULT_OUTPUT_COST_PER_1M
  );

  const inputCost = (toTokenCount(promptTokens) / 1_000_000) * inputCostPer1M;
  const outputCost =
    (toTokenCount(completionTokens) / 1_000_000) * outputCostPer1M;

  return Number((inputCost + outputCost).toFixed(8));
};

export const normalizeAiUsage = ({
  feature,
  provider = "openai",
  model,
  status,
  usage,
  errorMessage,
}) => {
  const promptTokens = toTokenCount(usage?.prompt_tokens ?? usage?.promptTokens);
  const completionTokens = toTokenCount(
    usage?.completion_tokens ?? usage?.completionTokens
  );
  const totalTokens = toTokenCount(
    usage?.total_tokens ?? usage?.totalTokens ?? promptTokens + completionTokens
  );

  return {
    feature,
    provider,
    model,
    status,
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedCostUsd: estimateAiCostUsd({ promptTokens, completionTokens }),
    errorMessage: sanitizeErrorMessage(errorMessage),
  };
};

export const recordAiUsage = async (userId, usagePayload) => {
  const objectUserId = toObjectId(userId);

  if (!objectUserId || !usagePayload?.feature) {
    return null;
  }

  try {
    return await AiUsage.create({
      userId: objectUserId,
      ...normalizeAiUsage(usagePayload),
    });
  } catch (error) {
    console.warn(
      `[AI] Usage tracking failed. ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    return null;
  }
};

export const getAiUsageSummary = async (userId) => {
  const objectUserId = toObjectId(userId);

  if (!objectUserId) {
    return {
      requestCount: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      successCount: 0,
      fallbackCount: 0,
      errorCount: 0,
      byFeature: [],
    };
  }

  const [summary] = await AiUsage.aggregate([
    { $match: { userId: objectUserId } },
    {
      $group: {
        _id: null,
        requestCount: { $sum: 1 },
        promptTokens: { $sum: "$promptTokens" },
        completionTokens: { $sum: "$completionTokens" },
        totalTokens: { $sum: "$totalTokens" },
        estimatedCostUsd: { $sum: "$estimatedCostUsd" },
        successCount: {
          $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] },
        },
        fallbackCount: {
          $sum: { $cond: [{ $eq: ["$status", "fallback"] }, 1, 0] },
        },
        errorCount: {
          $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] },
        },
      },
    },
  ]);

  const byFeature = await AiUsage.aggregate([
    { $match: { userId: objectUserId } },
    {
      $group: {
        _id: "$feature",
        requestCount: { $sum: 1 },
        totalTokens: { $sum: "$totalTokens" },
        estimatedCostUsd: { $sum: "$estimatedCostUsd" },
      },
    },
    { $sort: { requestCount: -1 } },
  ]);

  return {
    requestCount: summary?.requestCount ?? 0,
    promptTokens: summary?.promptTokens ?? 0,
    completionTokens: summary?.completionTokens ?? 0,
    totalTokens: summary?.totalTokens ?? 0,
    estimatedCostUsd: Number((summary?.estimatedCostUsd ?? 0).toFixed(8)),
    successCount: summary?.successCount ?? 0,
    fallbackCount: summary?.fallbackCount ?? 0,
    errorCount: summary?.errorCount ?? 0,
    byFeature: byFeature.map((item) => ({
      feature: item._id,
      requestCount: item.requestCount,
      totalTokens: item.totalTokens,
      estimatedCostUsd: Number((item.estimatedCostUsd ?? 0).toFixed(8)),
    })),
  };
};
