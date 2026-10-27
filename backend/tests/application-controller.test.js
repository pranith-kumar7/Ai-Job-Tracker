import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Application } from "../src/models/application.model.js";
import {
  createApplication,
  getApplications,
  getApplicationById,
  updateStatus,
  deleteApplication,
} from "../src/controllers/application.controller.js";

const userId = "64b000000000000000000001";
const otherUserId = "64b000000000000000000002";
const applicationId = "64b000000000000000000101";
const originals = {
  create: Application.create,
  find: Application.find,
  findOne: Application.findOne,
  findOneAndUpdate: Application.findOneAndUpdate,
  findOneAndDelete: Application.findOneAndDelete,
};
let records;
let response;

function res() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

beforeEach(() => {
  records = [];
  response = res();
  Application.create = async (data) => {
    const record = { _id: applicationId, ...data };
    records.push(record);
    return record;
  };
  Application.find = (filter) => ({
    sort: async () => records.filter((item) => String(item.userId) === String(filter.userId)),
  });
  Application.findOne = async (filter) => records.find((item) =>
    String(item._id) === String(filter._id) && String(item.userId) === String(filter.userId)
  ) ?? null;
  Application.findOneAndUpdate = async (filter, update) => {
    const item = records.find((record) =>
      String(record._id) === String(filter._id) && String(record.userId) === String(filter.userId)
    );
    if (item) Object.assign(item, update);
    return item ?? null;
  };
  Application.findOneAndDelete = async (filter) => {
    const index = records.findIndex((item) =>
      String(item._id) === String(filter._id) && String(item.userId) === String(filter.userId)
    );
    return index < 0 ? null : records.splice(index, 1)[0];
  };
});

test("creates an application with the authenticated owner and default status", async () => {
  await createApplication({ user: { id: userId }, body: { company: "Example", role: "Engineer" } }, response);
  assert.equal(response.statusCode, 201);
  assert.equal(response.body.application.userId, userId);
  assert.equal(response.body.application.status, "Applied");
});

test("rejects invalid application payloads", async () => {
  await createApplication({ user: { id: userId }, body: { company: "", role: "" } }, response);
  assert.equal(response.statusCode, 400);
});

test("lists only applications belonging to the authenticated user", async () => {
  records = [
    { _id: applicationId, userId, company: "Mine" },
    { _id: "64b000000000000000000102", userId: otherUserId, company: "Not mine" },
  ];
  await getApplications({ user: { id: userId } }, response);
  assert.equal(response.body.applications.length, 1);
  assert.equal(response.body.applications[0].company, "Mine");
});

test("does not expose another user's application by ID", async () => {
  records = [{ _id: applicationId, userId: otherUserId, company: "Private" }];
  await getApplicationById({ user: { id: userId }, params: { id: applicationId } }, response);
  assert.equal(response.statusCode, 404);
});

test("updates and deletes only the owner's application", async () => {
  records = [{ _id: applicationId, userId: otherUserId, status: "Applied" }];
  await updateStatus({ user: { id: userId }, params: { id: applicationId }, body: { status: "Interview" } }, response);
  assert.equal(response.statusCode, 404);
  await deleteApplication({ user: { id: userId }, params: { id: applicationId } }, response);
  assert.equal(response.statusCode, 404);
  assert.equal(records.length, 1);
});

test("restores original model methods after the test process", () => {
  assert.equal(typeof originals.create, "function");
});
