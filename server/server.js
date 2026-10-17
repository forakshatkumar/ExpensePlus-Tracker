/**
 * ExpensePlus API: Firebase Authentication ID token verification + Firestore Admin.
 * All Firestore reads/writes happen on the server, scoped to req.user.uid.
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import admin from "firebase-admin";

const app = express();
const port = Number(process.env.PORT || 4000);
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",").map((origin) => origin.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "32kb" }));

// On Vercel, provide FIREBASE_SERVICE_ACCOUNT_JSON as a private environment variable.
// Locally, GOOGLE_APPLICATION_CREDENTIALS may point to an untracked Admin JSON file.
// Never put Admin private keys in Vite variables, browser code, or GitHub.
function firebaseCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    let secret;
    try { secret = JSON.parse(raw); }
    catch { throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON. Paste the full service account JSON into Vercel Environment Variables."); }
    return admin.credential.cert(secret);
  }
  return admin.credential.applicationDefault();
}
admin.initializeApp({
  credential: firebaseCredential(),
  ...(process.env.FIREBASE_PROJECT_ID ? { projectId: process.env.FIREBASE_PROJECT_ID } : {}),
});
const db = admin.firestore();
const { FieldValue } = admin.firestore;

const DEFAULT_BIO = "B.Tech CSE student at ABES Engineering College | Building clean, mindful web experiences";
const BADGE_DAYS = [5, 10, 15, 20, 30];
const DEFAULT_MONTHLY_BUDGET = 15000; // INR (rupees), not paise
const MAX_BUDGET = 10_000_000;
const MAX_TRANSACTION_CENTS = 100_000_000_000;
const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Asia/Kolkata";
const BASE_CATEGORIES = [
  {id:"food",name:"Food",emoji:"🍕"},
  {id:"transport",name:"Transport",emoji:"🚕"},
  {id:"utilities",name:"Utilities",emoji:"💡"},
  {id:"entertainment",name:"Entertainment",emoji:"🎮"},
  {id:"other",name:"Other",emoji:"✨"},
];

function isDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(d.valueOf()) && d.toISOString().slice(0, 10) === value;
}
function appToday() {
  // ISO-ish en-CA calendar dates are used as Firestore document IDs.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit"
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
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}
function serializeTransaction(snapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id, description: data.description,
    amountCents: data.amountCents, categoryId: data.categoryId,
    date: data.date, note: typeof data.note === "string" ? data.note : "", isSubscription: data.isSubscription === true,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
  };
}
function respondError(res, status, message) { return res.status(status).json({ error: message }); }

// Every protected endpoint requires a Firebase client ID token.
async function authenticate(req, res, next) {
  const match = /^Bearer (\S+)$/i.exec(req.headers.authorization || "");
  if (!match) return respondError(res, 401, "Missing Firebase ID token.");
  try {
    req.user = await admin.auth().verifyIdToken(match[1]);
    return next();
  } catch {
    return respondError(res, 401, "Invalid or expired session. Please sign in again.");
  }
}
function userRef(req) { return db.collection("users").doc(req.user.uid); }
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
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  // Create-only: concurrent first requests cannot overwrite an existing profile.
  try { await ref.create(initial); }
  catch (error) { if (error.code !== 6 && error.code !== "already-exists") throw error; }
  return (await ref.get()).data();
}
function publicProfile(data) {
  return {
    name: data.name || "Akshat Kumar", email: data.email || "",
    profilePicture: data.profilePicture || "", bio: data.bio ?? DEFAULT_BIO,
    monthlyBudget: Number.isInteger(data.monthlyBudget) ? data.monthlyBudget : DEFAULT_MONTHLY_BUDGET,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
  };
}

// The root route helps identify an API deployment accidentally used as the frontend.
app.get("/", (_req, res) => res.json({ service: "ExpensePlus API", status: "running", frontend: "Deploy the client folder as a separate Vercel project.", health: "/api/health" }));
app.get("/api/health", (_req, res) => res.json({ ok: true, service: "expenseplus-api" }));
app.use("/api", authenticate);

// GET /api/user/profile — automatically creates missing user document.
app.get("/api/user/profile", async (req, res, next) => {
  try { res.json({ profile: publicProfile(await ensureUser(req)) }); }
  catch (error) { next(error); }
});

// PUT /api/user/profile — only editable fields may be supplied.
app.put("/api/user/profile", async (req, res, next) => {
  try {
    const allowed = ["bio", "profilePicture", "monthlyBudget"];
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) return respondError(res, 400, "Provide a JSON object.");
    if (Object.keys(body).length === 0 || Object.keys(body).some((key) => !allowed.includes(key))) {
      return respondError(res, 400, "Only bio, profilePicture, and monthlyBudget may be updated.");
    }
    const changes = {};
    if ("bio" in body) {
      if (typeof body.bio !== "string" || body.bio.length > 300) return respondError(res, 400, "Bio must be at most 300 characters.");
      changes.bio = body.bio;
    }
    if ("profilePicture" in body) {
      if (!validPicture(body.profilePicture)) return respondError(res, 400, "Picture must be an HTTPS URL or empty string.");
      changes.profilePicture = body.profilePicture;
    }
    if ("monthlyBudget" in body) {
      if (!Number.isInteger(body.monthlyBudget) || body.monthlyBudget < 0 || body.monthlyBudget > MAX_BUDGET) {
        return respondError(res, 400, `Monthly budget must be an integer from 0 to ${MAX_BUDGET} rupees.`);
      }
      changes.monthlyBudget = body.monthlyBudget;
    }
    await ensureUser(req);
    await userRef(req).update({ ...changes, updatedAt: FieldValue.serverTimestamp() });
    res.json({ profile: publicProfile((await userRef(req).get()).data()) });
  } catch (error) { next(error); }
});

// Existing v3 custom categories remain available after migration.
app.get("/api/categories", async (req, res, next) => {
  try {
    const snapshot = await userRef(req).collection("categories").get();
    const all = new Map(BASE_CATEGORIES.map((category) => [category.id, category]));
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (typeof data.name === "string" && data.name.trim()) {
        all.set(doc.id, { id:doc.id, name:data.name, emoji: typeof data.emoji === "string" ? data.emoji : "✨" });
      }
    }
    res.json({ categories:[...all.values()] });
  } catch(error){ next(error); }
});
app.post("/api/categories", async (req,res,next)=>{
  try {
    const {name,emoji="✨"}=req.body || {};
    if(typeof name!=="string" || !name.trim() || name.trim().length>24 || typeof emoji!=="string" || !emoji.trim() || emoji.length>12) return respondError(res,400,"Category needs a name (1–24) and an emoji (1–12).");
    const ref=userRef(req).collection("categories").doc();
    await ref.set({name:name.trim(),emoji:emoji.trim(),createdAt:FieldValue.serverTimestamp()});
    res.status(201).json({category:{id:ref.id,name:name.trim(),emoji:emoji.trim()}});
  }catch(error){next(error);}
});

function validateTransaction(body) {
  if(!body || typeof body!=="object" || Array.isArray(body)) return "Provide a transaction JSON object.";
  const allowed=["description","amountCents","categoryId","date","note","isSubscription"];
  if(Object.keys(body).some(key=>!allowed.includes(key))) return "Unknown transaction field.";
  const {description,amountCents,categoryId,date,note="",isSubscription=false}=body;
  if(typeof description!=="string" || !description.trim() || description.trim().length>100) return "Description must be 1–100 characters.";
  if(!Number.isSafeInteger(amountCents)||amountCents<=0||amountCents>MAX_TRANSACTION_CENTS) return "Invalid amount in paise.";
  if(typeof categoryId!=="string"||!categoryId||categoryId.length>100) return "Invalid category.";
  if(!isDate(date)) return "Date must be a valid YYYY-MM-DD.";
  if(typeof note!=="string"||note.length>500) return "Note must be at most 500 characters.";
  if(typeof isSubscription!=="boolean") return "isSubscription must be true or false.";
  return null;
}
function cleanTransaction(body) {
  return {description:body.description.trim(),amountCents:body.amountCents,categoryId:body.categoryId,date:body.date,note:(body.note||"").trim(),isSubscription:body.isSubscription===true};
}
function validExpenseId(value) {return /^[a-zA-Z0-9]{1,120}$/.test(value);}

// GET /api/transactions — reads legacy-compatible users/{uid}/expenses docs.
app.get("/api/transactions", async (req, res, next) => {
  try {
    const snapshot = await userRef(req).collection("expenses")
      .orderBy("date", "desc").limit(500).get();
    res.json({ transactions: snapshot.docs.map(serializeTransaction) });
  } catch (error) { next(error); }
});

// POST /api/transactions — amountCents is an INTEGER in paise.
app.post("/api/transactions", async (req, res, next) => {
  try {
    const message = validateTransaction(req.body);
    if(message) return respondError(res,400,message);
    const body=cleanTransaction(req.body);
    const ref=userRef(req).collection("expenses").doc();
    const batch=db.batch();
    batch.set(ref,{...body,createdAt:FieldValue.serverTimestamp()});
    batch.delete(userRef(req).collection("mindfulDays").doc(body.date));
    await batch.commit();
    res.status(201).json({transaction:{id:ref.id,...body}});
  }catch(error){next(error);}
});

app.put("/api/transactions/:id", async (req,res,next)=>{
  try{
    if(!validExpenseId(req.params.id)) return respondError(res,400,"Invalid transaction ID.");
    const message=validateTransaction(req.body);
    if(message) return respondError(res,400,message);
    const ref=userRef(req).collection("expenses").doc(req.params.id);
    const original=await ref.get();
    if(!original.exists) return respondError(res,404,"Transaction not found.");
    const data=cleanTransaction(req.body);
    const batch=db.batch();
    batch.update(ref,{...data,updatedAt:FieldValue.serverTimestamp()});
    // Editing an expense must invalidate a check-in on its new date.
    batch.delete(userRef(req).collection("mindfulDays").doc(data.date));
    await batch.commit();
    res.json({transaction:{id:ref.id,...data}});
  }catch(error){next(error);}
});

app.delete("/api/transactions/:id", async (req, res, next) => {
  try {
    if (!validExpenseId(req.params.id)) return respondError(res, 400, "Invalid transaction ID.");
    await userRef(req).collection("expenses").doc(req.params.id).delete();
    res.json({ ok: true });
  } catch (error) { next(error); }
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
    if (isDate(date) && Number.isInteger(amountCents)) spending.set(date, (spending.get(date) || 0) + amountCents);
  }
  const today = appToday();
  let cursor = days.has(today) && !spending.has(today) ? today : addDays(today, -1);
  let currentStreak = 0;
  while (currentStreak < 36600 && days.has(cursor) && !spending.has(cursor)) {
    currentStreak++; cursor = addDays(cursor, -1);
  }
  const highestStreak = Math.max(0, Number(progressSnapshot.data()?.highestStreak) || 0, currentStreak);
  const dailyThresholdCents = (await ensureUser(req)).monthlyBudget * 100 / 30;
  const calendar = [];
  for (let offset = -29; offset <= 0; offset++) {
    const date = addDays(today, offset);
    const amountCents = spending.get(date) || 0;
    const status = amountCents > 0
      ? (amountCents > dailyThresholdCents ? "high-spend" : "spent")
      : (days.has(date) ? "mindful" : "unchecked");
    calendar.push({ date, amountCents, status });
  }
  return {
    today, checkedInToday: days.has(today) && !spending.has(today),
    spentToday: spending.has(today), currentStreak, highestStreak,
    badges: BADGE_DAYS.map((days) => ({ days, unlocked: highestStreak >= days })),
    calendar,
  };
}
app.get("/api/streaks", async (req, res, next) => {
  try { res.json(await streakSummary(req)); } catch (error) { next(error); }
});

// POST /api/streaks — check in for TODAY only; server chooses date.
app.post("/api/streaks", async (req, res, next) => {
  try {
    if (req.body && Object.keys(req.body).length > 0) return respondError(res, 400, "Check-ins are only allowed for today; omit the request body.");
    const today = appToday();
    const expenses = await userRef(req).collection("expenses").where("date", "==", today).limit(1).get();
    if (!expenses.empty) return respondError(res, 409, "You recorded spending today, so a no-spend check-in is unavailable.");
    const ref = userRef(req).collection("mindfulDays").doc(today);
    await db.runTransaction(async (tx) => {
      const record = await tx.get(ref);
      if (!record.exists) tx.set(ref, { date: today, checkedAt: FieldValue.serverTimestamp() });
    });
    const summary = await streakSummary(req);
    const progressRef = userRef(req).collection("gamification").doc("progress");
    await db.runTransaction(async (tx) => {
      const old = await tx.get(progressRef);
      const previous = Number(old.data()?.highestStreak) || 0;
      if (summary.currentStreak > previous) tx.set(progressRef, { highestStreak: summary.currentStreak, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    });
    res.status(201).json(await streakSummary(req));
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  console.error("API error:", error);
  if (!res.headersSent) res.status(500).json({ error: "Internal server error. Check backend logs." });
});
// Vercel imports the default Express export as a serverless function.
// Keep a port listener only for local development (npm run dev).
if (!process.env.VERCEL) {
  app.listen(port, () => console.log(`ExpensePlus API listening on http://localhost:${port}`));
}
export default app;
