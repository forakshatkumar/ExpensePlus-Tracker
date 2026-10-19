/**
 * ExpensePlus API: Firebase Authentication ID token verification + Firestore Admin.
 * All Firestore reads/writes happen on the server, scoped to req.user.uid.
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import multer from "multer";
import sharp from "sharp";
import webpush from "web-push";
import registerSavingsRoutes from "./savingsRoutes.js";
import {
  checkBudgetAlerts,
  normalizePreferences,
  DEFAULT_PREFERENCES,
} from "./budgetAlerts.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "32kb" }));

// On Vercel, provide FIREBASE_SERVICE_ACCOUNT_JSON as a private environment variable.
// Locally, GOOGLE_APPLICATION_CREDENTIALS may point to an untracked Admin JSON file.
// Never put Admin private keys in Vite variables, browser code, or GitHub.
function firebaseCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    let secret;
    try {
      secret = JSON.parse(raw);
    } catch {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON. Paste the full service account JSON into Vercel Environment Variables.",
      );
    }
    return admin.credential.cert(secret);
  }
  return admin.credential.applicationDefault();
}
admin.initializeApp({
  credential: firebaseCredential(),
  ...(process.env.FIREBASE_PROJECT_ID
    ? { projectId: process.env.FIREBASE_PROJECT_ID }
    : {}),
});
const db = admin.firestore();
const { FieldValue } = admin.firestore;
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
if (VAPID_PUBLIC && VAPID_PRIVATE)
  webpush.setVapidDetails(
    "mailto:" + (process.env.PUSH_CONTACT_EMAIL || "admin@example.com"),
    VAPID_PUBLIC,
    VAPID_PRIVATE,
  );
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
});
async function pushToSubscriptions(userDoc, payload) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
  const snap = await userDoc.collection("pushSubscriptions").get();
  await Promise.all(
    snap.docs.map(async (doc) => {
      try {
        await webpush.sendNotification(
          doc.data().subscription,
          JSON.stringify(payload),
          { TTL: 300 },
        );
      } catch (error) {
        if ([404, 410].includes(error.statusCode)) await doc.ref.delete();
        else console.error("Push unavailable:", error.message);
      }
    }),
  );
}
const triggerAlerts = async (req, dates) => {
  for (const month of new Set(
    dates
      .filter(isDate)
      .map((d) => d.slice(0, 7))
      .filter((m) => m === appToday().slice(0, 7)),
  )) {
    try {
      await checkBudgetAlerts({
        db,
        admin,
        userDoc: userRef(req),
        month,
        sendPush: pushToSubscriptions,
      });
    } catch (error) {
      console.error("Noncritical budget alert failure:", error);
    }
  }
};

const DEFAULT_BIO =
  "B.Tech CSE student at ABES Engineering College | Building clean, mindful web experiences";
const BADGE_DAYS = [5, 10, 15, 20, 30];
const DEFAULT_MONTHLY_BUDGET = 15000; // INR (rupees), not paise
const MAX_BUDGET = 10_000_000;
const MAX_TRANSACTION_CENTS = 100_000_000_000;
const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Asia/Kolkata";
const BASE_CATEGORIES = [
  { id: "food", name: "Food", emoji: "🍕" },
  { id: "transport", name: "Transport", emoji: "🚕" },
  { id: "utilities", name: "Utilities", emoji: "💡" },
  { id: "entertainment", name: "Entertainment", emoji: "🎮" },
  { id: "other", name: "Other", emoji: "✨" },
];

function isDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const d = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(d.valueOf()) && d.toISOString().slice(0, 10) === value;
}
function appToday() {
  // ISO-ish en-CA calendar dates are used as Firestore document IDs.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type) => parts.find((entry) => entry.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function addDays(day, offset) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
function validPicture(value) {
  if (value === "") return true;
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
function serializeTransaction(snapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    description: data.description,
    amountCents: data.amountCents,
    categoryId: data.categoryId,
    date: data.date,
    note: typeof data.note === "string" ? data.note : "",
    isSubscription: data.isSubscription === true,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
  };
}
function respondError(res, status, message) {
  return res.status(status).json({ error: message });
}

// Every protected endpoint requires a Firebase client ID token.
async function authenticate(req, res, next) {
  const match = /^Bearer (\S+)$/i.exec(req.headers.authorization || "");
  if (!match) return respondError(res, 401, "Missing Firebase ID token.");
  try {
    req.user = await admin.auth().verifyIdToken(match[1]);
    return next();
  } catch {
    return respondError(
      res,
      401,
      "Invalid or expired session. Please sign in again.",
    );
  }
}
function userRef(req) {
  return db.collection("users").doc(req.user.uid);
}
async function ensureUser(req) {
  const ref = userRef(req);
  const snapshot = await ref.get();
  if (snapshot.exists) return snapshot.data();
  const initial = {
    name: req.user.name || "Akshat Kumar", // Google profile name when available
    email: req.user.email || "",
    profilePicture: req.user.picture || "",
    bio: DEFAULT_BIO,
    monthlyBudget: DEFAULT_MONTHLY_BUDGET,
    avatarPath: "",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  // Create-only: concurrent first requests cannot overwrite an existing profile.
  try {
    await ref.create(initial);
  } catch (error) {
    if (error.code !== 6 && error.code !== "already-exists") throw error;
  }
  return (await ref.get()).data();
}
function publicProfile(data) {
  return {
    name: data.name || "Akshat Kumar",
    email: data.email || "",
    profilePicture: data.profilePicture || "",
    bio: data.bio ?? DEFAULT_BIO,
    monthlyBudget: Number.isInteger(data.monthlyBudget)
      ? data.monthlyBudget
      : DEFAULT_MONTHLY_BUDGET,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    hasCustomAvatar: Boolean(data.avatarPath),
  };
}

// The root route helps identify an API deployment accidentally used as the frontend.
app.get("/", (_req, res) =>
  res.json({
    service: "ExpensePlus API",
    status: "running",
    frontend: "Deploy the client folder as a separate Vercel project.",
    health: "/api/health",
  }),
);
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, service: "expenseplus-api" }),
);
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "private, no-store");
  res.set("X-Content-Type-Options", "nosniff");
  next();
});
app.use("/api", authenticate);
// Private, transactional savings ledger and goal allocations.
registerSavingsRoutes(app,{db,FieldValue,userRef,isDate,appToday,respondError});

// Notifications are per-user, stored separately from private financial records.
app.get("/api/notifications", async (req, res, next) => {
  try {
    const snap = await userRef(req)
      .collection("notifications")
      .orderBy("createdAt", "desc")
      .limit(60)
      .get();
    res.set("Cache-Control", "private, no-store");
    res.json({
      notifications: snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
        readAt: doc.data().readAt?.toDate?.()?.toISOString() || null,
      })),
    });
  } catch (e) {
    next(e);
  }
});
app.patch("/api/notifications/:id/read", async (req, res, next) => {
  try {
    if (!/^[a-zA-Z0-9-]{1,120}$/.test(req.params.id))
      return respondError(res, 400, "Invalid notification ID.");
    const ref = userRef(req).collection("notifications").doc(req.params.id);
    if (!(await ref.get()).exists)
      return respondError(res, 404, "Notification not found.");
    await ref.update({ readAt: FieldValue.serverTimestamp() });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
app.post("/api/notifications/read-all", async (req, res, next) => {
  try {
    const snap = await userRef(req)
      .collection("notifications")
      .where("readAt", "==", null)
      .limit(400)
      .get();
    const batch = db.batch();
    snap.docs.forEach((d) =>
      batch.update(d.ref, { readAt: FieldValue.serverTimestamp() }),
    );
    if (!snap.empty) await batch.commit();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
app.get("/api/notifications/preferences", async (req, res, next) => {
  try {
    const doc = await userRef(req)
      .collection("settings")
      .doc("notifications")
      .get();
    res.json({ preferences: normalizePreferences(doc.data()) });
  } catch (e) {
    next(e);
  }
});
app.put("/api/notifications/preferences", async (req, res, next) => {
  try {
    const raw = req.body || {};
    if (
      typeof raw !== "object" ||
      Array.isArray(raw) ||
      Object.keys(raw).some(
        (k) => !["inAppBudgetAlerts", "thresholds", "pushEnabled"].includes(k),
      )
    )
      return respondError(res, 400, "Invalid notification preferences.");
    if (
      "inAppBudgetAlerts" in raw &&
      typeof raw.inAppBudgetAlerts !== "boolean"
    )
      return respondError(res, 400, "Invalid alert setting.");
    if ("pushEnabled" in raw && typeof raw.pushEnabled !== "boolean")
      return respondError(res, 400, "Invalid push setting.");
    if (
      "thresholds" in raw &&
      (!Array.isArray(raw.thresholds) ||
        raw.thresholds.some((x) => ![50, 75, 90, 100].includes(x)))
    )
      return respondError(res, 400, "Invalid thresholds.");
    const ref = userRef(req).collection("settings").doc("notifications");
    await ref.set(raw, { merge: true });
    res.json({ preferences: normalizePreferences((await ref.get()).data()) });
  } catch (e) {
    next(e);
  }
});
app.get("/api/push/config", (_req, res) =>
  res.json({ publicKey: VAPID_PUBLIC || null }),
);
app.post("/api/push/register", async (req, res, next) => {
  try {
    if (!VAPID_PUBLIC)
      return respondError(
        res,
        503,
        "Web Push is not configured on the backend.",
      );
    const sub = req.body?.subscription;
    // Only known browser push service origins may be used as push delivery targets.
    let pushHost = "";
    try {
      pushHost = new URL(sub?.endpoint).hostname.toLowerCase();
    } catch {}
    const allowedPushHost =
      pushHost === "fcm.googleapis.com" ||
      pushHost === "updates.push.services.mozilla.com" ||
      pushHost === "web.push.apple.com" ||
      pushHost.endsWith(".notify.windows.com") ||
      pushHost.endsWith(".push.apple.com");
    if (!allowedPushHost)
      return respondError(res, 400, "Unsupported browser push provider.");
    if (
      !sub ||
      typeof sub.endpoint !== "string" ||
      !sub.endpoint.startsWith("https://") ||
      sub.endpoint.length > 2000 ||
      !sub.keys ||
      typeof sub.keys.p256dh !== "string" ||
      typeof sub.keys.auth !== "string"
    )
      return respondError(res, 400, "Invalid push subscription.");
    const id = (await import("node:crypto"))
      .createHash("sha256")
      .update(sub.endpoint)
      .digest("hex");
    await userRef(req)
      .collection("pushSubscriptions")
      .doc(id)
      .set({ subscription: sub, createdAt: FieldValue.serverTimestamp() });
    await userRef(req)
      .collection("settings")
      .doc("notifications")
      .set({ pushEnabled: true }, { merge: true });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
app.delete("/api/push/unregister", async (req, res, next) => {
  try {
    const endpoint = req.body?.endpoint;
    if (typeof endpoint !== "string" || !endpoint.startsWith("https://"))
      return respondError(res, 400, "Invalid endpoint.");
    const id = (await import("node:crypto"))
      .createHash("sha256")
      .update(endpoint)
      .digest("hex");
    await userRef(req).collection("pushSubscriptions").doc(id).delete();
    const remaining = await userRef(req)
      .collection("pushSubscriptions")
      .limit(1)
      .get();
    await userRef(req)
      .collection("settings")
      .doc("notifications")
      .set({ pushEnabled: !remaining.empty }, { merge: true });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
// Avatar storage that works on existing Firestore without requiring the paid
// Firebase Cloud Storage bucket. Photos are reduced to a small WebP and stored
// in users/{uid}/privateAssets/avatar. Only this authenticated API reads them.
// Older Storage-backed avatars are still readable and can be replaced safely.
const FIRESTORE_AVATAR_PATH = "firestore:avatar";
function avatarDocument(req) {
  return userRef(req).collection("privateAssets").doc("avatar");
}
function previousStorageObject(req, path) {
  if (
    !path ||
    path === FIRESTORE_AVATAR_PATH ||
    !path.startsWith(`profile-images/${req.user.uid}/`)
  )
    return null;
  return admin
    .storage()
    .bucket(
      process.env.FIREBASE_STORAGE_BUCKET ||
        "spendly-ba3b0.firebasestorage.app",
    )
    .file(path);
}

app.get("/api/user/avatar", async (req, res, next) => {
  try {
    const path = (await ensureUser(req)).avatarPath;
    if (!path) return respondError(res, 404, "No custom avatar.");
    let buffer;
    if (path === FIRESTORE_AVATAR_PATH) {
      const document = await avatarDocument(req).get();
      const base64 = document.data()?.webpBase64;
      if (typeof base64 !== "string" || !base64)
        return respondError(
          res,
          404,
          "Avatar not found. Please upload a new photo.",
        );
      buffer = Buffer.from(base64, "base64");
    } else {
      const previous = previousStorageObject(req, path);
      if (!previous)
        return respondError(
          res,
          404,
          "Avatar not found. Please upload a new photo.",
        );
      try {
        [buffer] = await previous.download();
      } catch (error) {
        console.warn(
          "Legacy Firebase Storage avatar unavailable:",
          error.code || error.message,
        );
        return respondError(
          res,
          404,
          "Previous picture is unavailable. Upload a new photo to replace it.",
        );
      }
    }
    res.set("Cache-Control", "private, no-store");
    res.type("image/webp").send(buffer);
  } catch (error) {
    next(error);
  }
});
app.post(
  "/api/user/avatar",
  upload.single("avatar"),
  async (req, res, next) => {
    try {
      if (!req.file)
        return respondError(res, 400, "Choose a JPEG, PNG, or WebP image.");
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(req.file.mimetype)
      )
        return respondError(res, 400, "Use JPEG, PNG, or WebP.");
      let image;
      try {
        const input = sharp(req.file.buffer, { limitInputPixels: 20_000_000 });
        const metadata = await input.metadata();
        const actualMime = {
          jpeg: "image/jpeg",
          png: "image/png",
          webp: "image/webp",
        }[metadata.format];
        if (actualMime !== req.file.mimetype)
          return respondError(
            res,
            400,
            "Image content does not match JPEG, PNG, or WebP.",
          );
        // Store only a compact square avatar. No EXIF metadata is retained.
        image = await input
          .rotate()
          .resize(320, 320, { fit: "cover", position: "attention" })
          .webp({ quality: 77, effort: 4 })
          .toBuffer();
        if (image.length > 150_000) {
          image = await sharp(image)
            .resize(224, 224)
            .webp({ quality: 65, effort: 4 })
            .toBuffer();
        }
        if (image.length > 150_000)
          return respondError(
            res,
            413,
            "This photo could not be reduced enough. Try a different JPEG or PNG.",
          );
      } catch (error) {
        console.warn("Rejected avatar image:", error.message);
        return respondError(
          res,
          400,
          "The selected photo could not be processed. Choose a valid JPEG, PNG, or WebP under 4 MB.",
        );
      }
      const previous = await ensureUser(req);
      const batch = db.batch();
      batch.set(avatarDocument(req), {
        webpBase64: image.toString("base64"),
        contentType: "image/webp",
        updatedAt: FieldValue.serverTimestamp(),
      });
      batch.update(userRef(req), {
        avatarPath: FIRESTORE_AVATAR_PATH,
        updatedAt: FieldValue.serverTimestamp(),
      });
      await batch.commit();
      // Best-effort cleanup. Old bucket failures must not break successful uploads.
      const oldObject = previousStorageObject(req, previous.avatarPath);
      if (oldObject)
        oldObject
          .delete({ ignoreNotFound: true })
          .catch((error) =>
            console.warn("Legacy avatar cleanup:", error.message),
          );
      res.json({ profile: publicProfile((await userRef(req).get()).data()) });
    } catch (error) {
      console.error(
        "Avatar Firestore persistence failed:",
        error.code || error.message,
      );
      next(error);
    }
  },
);
app.delete("/api/user/avatar", async (req, res, next) => {
  try {
    const previous = await ensureUser(req);
    const batch = db.batch();
    batch.delete(avatarDocument(req));
    batch.update(userRef(req), {
      avatarPath: "",
      profilePicture: "",
      updatedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    const oldObject = previousStorageObject(req, previous.avatarPath);
    if (oldObject)
      oldObject
        .delete({ ignoreNotFound: true })
        .catch((error) =>
          console.warn("Legacy avatar cleanup:", error.message),
        );
    res.json({ profile: publicProfile((await userRef(req).get()).data()) });
  } catch (error) {
    next(error);
  }
});

// GET /api/user/profile — automatically creates missing user document.
app.get("/api/user/profile", async (req, res, next) => {
  try {
    res.json({ profile: publicProfile(await ensureUser(req)) });
  } catch (error) {
    next(error);
  }
});

// PUT /api/user/profile — only editable fields may be supplied.
app.put("/api/user/profile", async (req, res, next) => {
  try {
    const allowed = ["name", "bio", "profilePicture", "monthlyBudget"];
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body))
      return respondError(res, 400, "Provide a JSON object.");
    if (
      Object.keys(body).length === 0 ||
      Object.keys(body).some((key) => !allowed.includes(key))
    ) {
      return respondError(
        res,
        400,
        "Only name, bio, profilePicture, and monthlyBudget may be updated.",
      );
    }
    const changes = {};
    if ("name" in body) {
      if (
        typeof body.name !== "string" ||
        !body.name.trim() ||
        body.name.trim().length > 80
      )
        return respondError(res, 400, "Display name must be 1–80 characters.");
      changes.name = body.name.trim();
    }
    if ("bio" in body) {
      if (typeof body.bio !== "string" || body.bio.length > 300)
        return respondError(res, 400, "Bio must be at most 300 characters.");
      changes.bio = body.bio;
    }
    if ("profilePicture" in body) {
      if (!validPicture(body.profilePicture))
        return respondError(
          res,
          400,
          "Picture must be an HTTPS URL or empty string.",
        );
      changes.profilePicture = body.profilePicture;
    }
    if ("monthlyBudget" in body) {
      if (
        !Number.isInteger(body.monthlyBudget) ||
        body.monthlyBudget < 0 ||
        body.monthlyBudget > MAX_BUDGET
      ) {
        return respondError(
          res,
          400,
          `Monthly budget must be an integer from 0 to ${MAX_BUDGET} rupees.`,
        );
      }
      changes.monthlyBudget = body.monthlyBudget;
    }
    await ensureUser(req);
    await userRef(req).update({
      ...changes,
      updatedAt: FieldValue.serverTimestamp(),
    });
    if ("monthlyBudget" in changes) await triggerAlerts(req, [appToday()]);
    res.json({ profile: publicProfile((await userRef(req).get()).data()) });
  } catch (error) {
    next(error);
  }
});

// Existing v3 custom categories remain available after migration.
app.get("/api/categories", async (req, res, next) => {
  try {
    const snapshot = await userRef(req).collection("categories").get();
    const all = new Map(
      BASE_CATEGORIES.map((category) => [category.id, category]),
    );
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (typeof data.name === "string" && data.name.trim()) {
        all.set(doc.id, {
          id: doc.id,
          name: data.name,
          emoji: typeof data.emoji === "string" ? data.emoji : "✨",
        });
      }
    }
    res.json({ categories: [...all.values()] });
  } catch (error) {
    next(error);
  }
});
app.post("/api/categories", async (req, res, next) => {
  try {
    const { name, emoji = "✨" } = req.body || {};
    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 24 ||
      typeof emoji !== "string" ||
      !emoji.trim() ||
      emoji.length > 12
    )
      return respondError(
        res,
        400,
        "Category needs a name (1–24) and an emoji (1–12).",
      );
    const ref = userRef(req).collection("categories").doc();
    await ref.set({
      name: name.trim(),
      emoji: emoji.trim(),
      createdAt: FieldValue.serverTimestamp(),
    });
    res
      .status(201)
      .json({
        category: { id: ref.id, name: name.trim(), emoji: emoji.trim() },
      });
  } catch (error) {
    next(error);
  }
});

function validateTransaction(body) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    return "Provide a transaction JSON object.";
  const allowed = [
    "description",
    "amountCents",
    "categoryId",
    "date",
    "note",
    "isSubscription",
  ];
  if (Object.keys(body).some((key) => !allowed.includes(key)))
    return "Unknown transaction field.";
  const {
    description,
    amountCents,
    categoryId,
    date,
    note = "",
    isSubscription = false,
  } = body;
  if (
    typeof description !== "string" ||
    !description.trim() ||
    description.trim().length > 100
  )
    return "Description must be 1–100 characters.";
  if (
    !Number.isSafeInteger(amountCents) ||
    amountCents <= 0 ||
    amountCents > MAX_TRANSACTION_CENTS
  )
    return "Invalid amount in paise.";
  if (typeof categoryId !== "string" || !categoryId || categoryId.length > 100)
    return "Invalid category.";
  if (!isDate(date)) return "Date must be a valid YYYY-MM-DD.";
  if (typeof note !== "string" || note.length > 500)
    return "Note must be at most 500 characters.";
  if (typeof isSubscription !== "boolean")
    return "isSubscription must be true or false.";
  return null;
}
function cleanTransaction(body) {
  return {
    description: body.description.trim(),
    amountCents: body.amountCents,
    categoryId: body.categoryId,
    date: body.date,
    note: (body.note || "").trim(),
    isSubscription: body.isSubscription === true,
  };
}
function validExpenseId(value) {
  return /^[a-zA-Z0-9]{1,120}$/.test(value);
}

// GET /api/transactions — reads legacy-compatible users/{uid}/expenses docs.
app.get("/api/transactions", async (req, res, next) => {
  try {
    const snapshot = await userRef(req)
      .collection("expenses")
      .orderBy("date", "desc")
      .limit(500)
      .get();
    res.json({ transactions: snapshot.docs.map(serializeTransaction) });
  } catch (error) {
    next(error);
  }
});

// POST /api/transactions — amountCents is an INTEGER in paise.
app.post("/api/transactions", async (req, res, next) => {
  try {
    const message = validateTransaction(req.body);
    if (message) return respondError(res, 400, message);
    const body = cleanTransaction(req.body);
    const ref = userRef(req).collection("expenses").doc();
    const batch = db.batch();
    batch.set(ref, { ...body, createdAt: FieldValue.serverTimestamp() });
    batch.delete(userRef(req).collection("mindfulDays").doc(body.date));
    await batch.commit();
    await triggerAlerts(req, [body.date]);
    res.status(201).json({ transaction: { id: ref.id, ...body } });
  } catch (error) {
    next(error);
  }
});

app.put("/api/transactions/:id", async (req, res, next) => {
  try {
    if (!validExpenseId(req.params.id))
      return respondError(res, 400, "Invalid transaction ID.");
    const message = validateTransaction(req.body);
    if (message) return respondError(res, 400, message);
    const ref = userRef(req).collection("expenses").doc(req.params.id);
    const original = await ref.get();
    if (!original.exists)
      return respondError(res, 404, "Transaction not found.");
    const data = cleanTransaction(req.body);
    const batch = db.batch();
    batch.update(ref, { ...data, updatedAt: FieldValue.serverTimestamp() });
    // Editing an expense must invalidate a check-in on its new date.
    batch.delete(userRef(req).collection("mindfulDays").doc(data.date));
    await batch.commit();
    await triggerAlerts(
      req,
      [original.data()?.date, data.date].filter(Boolean),
    );
    res.json({ transaction: { id: ref.id, ...data } });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/transactions/:id", async (req, res, next) => {
  try {
    if (!validExpenseId(req.params.id))
      return respondError(res, 400, "Invalid transaction ID.");
    const expenseRef = userRef(req).collection("expenses").doc(req.params.id);
    const old = await expenseRef.get();
    await expenseRef.delete();
    if (old.exists && isDate(old.data()?.date))
      await triggerAlerts(req, [old.data().date]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Compute streaks only from explicit check-ins (no transaction = not proof of no spend).
async function streakSummary(req) {
  const [daysSnapshot, expensesSnapshot, progressSnapshot] = await Promise.all([
    userRef(req).collection("mindfulDays").get(),
    userRef(req).collection("expenses").get(),
    userRef(req).collection("gamification").doc("progress").get(),
  ]);
  const days = new Set(daysSnapshot.docs.map((doc) => doc.id));
  const spending = new Map();
  for (const doc of expensesSnapshot.docs) {
    const { date, amountCents } = doc.data();
    if (isDate(date) && Number.isInteger(amountCents))
      spending.set(date, (spending.get(date) || 0) + amountCents);
  }
  const today = appToday();
  let cursor =
    days.has(today) && !spending.has(today) ? today : addDays(today, -1);
  let currentStreak = 0;
  while (currentStreak < 36600 && days.has(cursor) && !spending.has(cursor)) {
    currentStreak++;
    cursor = addDays(cursor, -1);
  }
  const highestStreak = Math.max(
    0,
    Number(progressSnapshot.data()?.highestStreak) || 0,
    currentStreak,
  );
  const dailyThresholdCents =
    ((await ensureUser(req)).monthlyBudget * 100) / 30;
  const calendar = [];
  for (let offset = -29; offset <= 0; offset++) {
    const date = addDays(today, offset);
    const amountCents = spending.get(date) || 0;
    const status =
      amountCents > 0
        ? amountCents > dailyThresholdCents
          ? "high-spend"
          : "spent"
        : days.has(date)
          ? "mindful"
          : "unchecked";
    calendar.push({ date, amountCents, status });
  }
  return {
    today,
    checkedInToday: days.has(today) && !spending.has(today),
    spentToday: spending.has(today),
    currentStreak,
    highestStreak,
    badges: BADGE_DAYS.map((days) => ({
      days,
      unlocked: highestStreak >= days,
    })),
    calendar,
  };
}
app.get("/api/streaks", async (req, res, next) => {
  try {
    res.json(await streakSummary(req));
  } catch (error) {
    next(error);
  }
});

// POST /api/streaks — check in for TODAY only; server chooses date.
app.post("/api/streaks", async (req, res, next) => {
  try {
    if (req.body && Object.keys(req.body).length > 0)
      return respondError(
        res,
        400,
        "Check-ins are only allowed for today; omit the request body.",
      );
    const today = appToday();
    const expenses = await userRef(req)
      .collection("expenses")
      .where("date", "==", today)
      .limit(1)
      .get();
    if (!expenses.empty)
      return respondError(
        res,
        409,
        "You recorded spending today, so a no-spend check-in is unavailable.",
      );
    const ref = userRef(req).collection("mindfulDays").doc(today);
    await db.runTransaction(async (tx) => {
      const record = await tx.get(ref);
      if (!record.exists)
        tx.set(ref, { date: today, checkedAt: FieldValue.serverTimestamp() });
    });
    const summary = await streakSummary(req);
    const progressRef = userRef(req).collection("gamification").doc("progress");
    await db.runTransaction(async (tx) => {
      const old = await tx.get(progressRef);
      const previous = Number(old.data()?.highestStreak) || 0;
      if (summary.currentStreak > previous)
        tx.set(
          progressRef,
          {
            highestStreak: summary.currentStreak,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
    });
    res.status(201).json(await streakSummary(req));
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  if (error?.code === "LIMIT_FILE_SIZE")
    return res
      .status(413)
      .json({ error: "Image must be 4 MB or smaller (Vercel upload limit)." });
  console.error("API error:", error);
  if (!res.headersSent)
    res
      .status(500)
      .json({ error: "Internal server error. Check backend logs." });
});
// Vercel imports the default Express export as a serverless function.
// Keep a port listener only for local development (npm run dev).
if (!process.env.VERCEL) {
  app.listen(port, () =>
    console.log(`ExpensePlus API listening on http://localhost:${port}`),
  );
}
export default app;
