import assert from "node:assert/strict";
import {
  findThreshold,
  budgetMessage,
  normalizePreferences,
} from "./budgetAlerts.js";
const prefs = normalizePreferences({
  thresholds: [50, 75, 90, 100],
  inAppBudgetAlerts: true,
});
assert.equal(findThreshold(0, 5000, prefs), null);
assert.equal(findThreshold(250000, 5000, prefs), 50);
assert.equal(findThreshold(375000, 5000, prefs), 75);
assert.equal(findThreshold(450000, 5000, prefs), 90);
assert.equal(findThreshold(500000, 5000, prefs), 100);
assert.equal(findThreshold(500100, 5000, prefs), 101);
assert.equal(findThreshold(500000, 0, prefs), null);
assert.equal(findThreshold(400000, 5000, { thresholds: [90] }), null);
assert.equal(findThreshold(400000, 5000, { inAppBudgetAlerts: false }), null);
assert.match(budgetMessage(90, 450000, 5000).message, /500/);
assert.equal(
  normalizePreferences({ thresholds: [50, 50, 101, "90"] }).thresholds.join(
    ",",
  ),
  "50",
);
console.log("Budget alert unit tests passed.");

import { checkBudgetAlerts } from "./budgetAlerts.js";
const seen = new Set();
let pushCount = 0;
const admin = {
  firestore: { FieldValue: { serverTimestamp: () => new Date() } },
};
const profile = { data: () => ({ monthlyBudget: 5000 }) };
const preferences = {
  data: () => ({
    inAppBudgetAlerts: true,
    thresholds: [50, 75, 90, 100],
    pushEnabled: true,
  }),
};
const expenseQuery = {
  where() {
    return this;
  },
  get: async () => ({ docs: [{ data: () => ({ amountCents: 450000 }) }] }),
};
const userDoc = {
  collection(collection) {
    if (collection === "expenses") return expenseQuery;
    if (collection === "settings")
      return { doc: () => ({ get: async () => preferences }) };
    if (collection === "notifications")
      return {
        doc: (id) => ({
          id,
          async create() {
            if (seen.has(id)) {
              const error = Error("already exists");
              error.code = 6;
              throw error;
            }
            seen.add(id);
          },
        }),
      };
    throw Error("Unexpected collection: " + collection);
  },
  get: async () => profile,
};
const args = {
  db: {},
  admin,
  userDoc,
  month: "2026-10",
  sendPush: async () => {
    pushCount++;
  },
};
assert.equal((await checkBudgetAlerts(args)).length, 1);
assert.equal((await checkBudgetAlerts(args)).length, 0);
assert.deepEqual([...seen], ["budget-2026-10-90"]);
assert.equal(pushCount, 1);
console.log("Idempotent Firestore notification test passed.");
