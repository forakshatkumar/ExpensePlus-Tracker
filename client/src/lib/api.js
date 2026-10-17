import { auth } from "./firebase";

const configuredApiUrl = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");
const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const baseUrl = configuredApiUrl || (isLocal ? "http://localhost:4000" : "");

export async function api(path, options = {}) {
  if (!baseUrl) {
    throw new Error("Backend URL missing. In Vercel → frontend project → Settings → Environment Variables, add VITE_API_URL with your deployed ExpensePlus API URL, then redeploy.");
  }
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
    });
  } catch {
    throw new Error("Cannot reach the ExpensePlus API. Check VITE_API_URL, API deployment, and CLIENT_ORIGIN on the backend.");
  }
  let data;
  try { data = await response.json(); } catch { data = {}; }
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
