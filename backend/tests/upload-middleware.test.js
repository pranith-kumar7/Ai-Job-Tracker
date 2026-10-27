import test from "node:test";
import assert from "node:assert/strict";
import { resumeFileFilter } from "../src/middleware/upload.middleware.js";

function runFilter(file) {
  let result;
  resumeFileFilter({}, file, (error, accepted) => {
    result = { error, accepted };
  });
  return result;
}

test("resume upload accepts matching PDF and TXT types", () => {
  assert.deepEqual(runFilter({ mimetype: "application/pdf", originalname: "resume.pdf" }), {
    error: null,
    accepted: true,
  });
  assert.deepEqual(runFilter({ mimetype: "text/plain", originalname: "resume.TXT" }), {
    error: null,
    accepted: true,
  });
});

test("resume upload rejects mismatched and unsupported file types", () => {
  assert.ok(runFilter({ mimetype: "application/pdf", originalname: "resume.txt" }).error instanceof Error);
  assert.ok(runFilter({ mimetype: "image/png", originalname: "resume.png" }).error instanceof Error);
});
