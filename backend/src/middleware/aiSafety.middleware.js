const WINDOW_MS = 60 * 1000;
const DEFAULT_MAX_REQUESTS = 30;
const buckets = new Map();

const getMaxRequests = () => {
  const value = Number.parseInt(process.env.AI_RATE_LIMIT_PER_MINUTE ?? "", 10);

  if (!Number.isFinite(value) || value < 1) {
    return DEFAULT_MAX_REQUESTS;
  }

  return Math.min(value, 300);
};

const getClientKey = (req) => req.user?.id ?? req.ip ?? "anonymous";

const cleanupBuckets = (now) => {
  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.startedAt > WINDOW_MS * 2) {
      buckets.delete(key);
    }
  }
};

export const aiRateLimiter = (req, res, next) => {
  const now = Date.now();
  const key = getClientKey(req);
  const maxRequests = getMaxRequests();
  const bucket = buckets.get(key);

  cleanupBuckets(now);

  if (!bucket || now - bucket.startedAt > WINDOW_MS) {
    buckets.set(key, { count: 1, startedAt: now });
    next();
    return;
  }

  if (bucket.count >= maxRequests) {
    return res.status(429).json({
      message: "Too many AI requests. Please wait a minute and try again.",
    });
  }

  bucket.count += 1;
  next();
};

const promptInjectionPatterns = [
  /ignore (all )?(previous|prior|above) instructions/i,
  /disregard (all )?(previous|prior|above) instructions/i,
  /reveal (the )?(system|developer) prompt/i,
  /show (the )?(system|developer) prompt/i,
  /you are now (in )?developer mode/i,
  /act as (the )?system/i,
];

const collectStringValues = (value, collected = []) => {
  if (typeof value === "string") {
    collected.push(value);
    return collected;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectStringValues(item, collected));
    return collected;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectStringValues(item, collected));
  }

  return collected;
};

export const aiInputGuard = (req, res, next) => {
  const textValues = collectStringValues(req.body);
  const suspicious = textValues.some((value) =>
    promptInjectionPatterns.some((pattern) => pattern.test(value))
  );

  if (suspicious) {
    return res.status(400).json({
      message: "Input contains unsafe prompt-injection instructions.",
    });
  }

  next();
};
