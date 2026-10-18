import { auth } from "./firebase";

// Production uses a same-origin Vercel rewrite: /api/* -> deployed Express API.
// This works even when VITE_API_URL wasn't added to the Vercel build.
// For local development, use client/.env VITE_API_URL=http://localhost:4000.
const localApiUrl = (import.meta.env.VITE_API_URL || "http://localhost:4000")
  .trim()
  .replace(/\/+$/, "");
const baseUrl = import.meta.env.PROD ? "" : localApiUrl;

export async function api(path, options = {}) {
  if (!path.startsWith("/api/")) throw new Error("Invalid API route.");
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in to continue.");
  const token = await user.getIdToken();
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
      cache: "no-store",
    });
  } catch (error) {
    console.error("ExpensePlus API network error:", error);
    throw new Error(
      "Unable to contact the ExpensePlus API. Check the backend deployment and client/vercel.json rewrite.",
    );
  }
  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) {
    if (response.status === 404)
      throw new Error(
        "API route not found. Redeploy the frontend so the /api Vercel rewrite takes effect.",
      );
    if (response.status === 401)
      throw new Error(
        data.error || "Session expired. Sign out and sign in again.",
      );
    if (response.status === 500)
      throw new Error(
        data.error ||
          "The backend returned a server error. Check ExpensePlus API Function logs and Firebase Admin access.",
      );
    throw new Error(data.error || `API request failed (${response.status}).`);
  }
  return data;
}

// Authenticated binary endpoints are never persisted in Cache Storage.
export async function apiBinary(path, options = {}) {
  if (!path.startsWith("/api/")) throw new Error("Invalid API route.");
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in to continue.");
  const token = await user.getIdToken();
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    let message = "Unable to load image.";
    try {
      message = (await response.json()).error || message;
    } catch {}
    throw new Error(message);
  }
  return response.blob();
}
export async function apiUpload(path, file) {
  const form = new FormData();
  form.append("avatar", file);
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in to continue.");
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    body: form,
    headers: { Authorization: `Bearer ${await user.getIdToken()}` },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Picture upload failed.");
  return data;
}
