import test from "node:test";
import assert from "node:assert/strict";
import { parseJobDescription, generateResumeSuggestions } from "../src/services/ai.service.js";

test("job description parser returns structured fallback data without an API key", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const usage = [];
    const parsed = await parseJobDescription(
      "Software Engineer\nRequirements:\n- JavaScript\n- React\n- Node.js\nLocation: Hyderabad",
      { onUsage: async (entry) => usage.push(entry) }
    );
    assert.ok(Array.isArray(parsed.requiredSkills));
    assert.ok(Array.isArray(parsed.niceToHaveSkills));
    assert.ok(Array.isArray(parsed.responsibilities));
    assert.ok(parsed.requiredSkills.length > 0);
    assert.ok(usage.some((entry) => entry.status === "fallback"));
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
});

test("resume suggestion fallback returns multiple role-specific suggestions", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const suggestions = await generateResumeSuggestions({
      role: "Backend Developer",
      company: "Example Ltd",
      requiredSkills: ["Node.js", "MongoDB"],
    });
    assert.ok(suggestions.length >= 3);
    assert.ok(suggestions.every((item) => typeof item === "string" && item.length > 0));
    assert.ok(suggestions.some((item) => item.includes("Backend Developer")));
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
});

test("long job-board intro produces a concise role title under the 160-character limit", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const parsed = await parseJobDescription(
      "Job Info This Site Engineering role within Nokia's Product Validation & Test (PV&T) R&D is responsible for developing and deploying optical test stations directly at manufacturing sites.\\nYour responsibilities\\nDesign and debug test stations."
    );
    assert.equal(parsed.role, "Site Engineering");
    assert.ok(parsed.role.length <= 160);
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
});
