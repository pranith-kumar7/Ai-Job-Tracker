import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { User } from "../src/models/user.model.js";
import { register, login } from "../src/controllers/auth.controller.js";

const originalFindOne = User.findOne;
const originalCreate = User.create;
let users;

function makeResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

beforeEach(() => {
  users = [];
  User.findOne = async ({ email }) => users.find((user) => user.email === email) ?? null;
  User.create = async (data) => {
    const user = { _id: "64b000000000000000000001", ...data };
    users.push(user);
    return user;
  };
});

test("register normalizes email, hashes password, and returns a token", async () => {
  const response = makeResponse();
  await register({ body: { email: "  TEST@Example.com ", password: "secure-password" } }, response);
  assert.equal(response.statusCode, 201);
  assert.equal(response.body.user.email, "test@example.com");
  assert.ok(response.body.token);
  assert.notEqual(users[0].password, "secure-password");
  assert.ok(await bcrypt.compare("secure-password", users[0].password));
});

test("register rejects invalid email and short password", async () => {
  const response = makeResponse();
  await register({ body: { email: "bad", password: "x" } }, response);
  assert.equal(response.statusCode, 400);
});

test("login is case-insensitive and rejects incorrect credentials", async () => {
  const password = await bcrypt.hash("secure-password", 10);
  users.push({ _id: "64b000000000000000000001", email: "test@example.com", password });
  const success = makeResponse();
  await login({ body: { email: "TEST@Example.com", password: "secure-password" } }, success);
  assert.equal(success.statusCode, 200);
  assert.ok(success.body.token);

  const failure = makeResponse();
  await login({ body: { email: "test@example.com", password: "wrong-password" } }, failure);
  assert.equal(failure.statusCode, 400);
});

test("duplicate-key race returns conflict", async () => {
  User.create = async () => { const error = new Error("duplicate"); error.code = 11000; throw error; };
  const response = makeResponse();
  await register({ body: { email: "test@example.com", password: "secure-password" } }, response);
  assert.equal(response.statusCode, 409);
});

test("restore model methods after tests", () => {
  User.findOne = originalFindOne;
  User.create = originalCreate;
  assert.equal(typeof User.findOne, "function");
});
