import { getAuth, signInWithCustomToken } from "firebase/auth";
import { app, auth } from "../firebase";

/**
 * Sign in with a LINE ID token via your backend endpoint,
 * which returns a Firebase Custom Token.
 */
export async function signInWithLine(lineIdToken: string): Promise<void> {
  const endpoint = process.env.NEXT_PUBLIC_AUTH_ENDPOINT;
  if (!endpoint) {
    throw new Error(
      "NEXT_PUBLIC_AUTH_ENDPOINT is not set. Add it to Netlify environment variables and .env.local."
    );
  }

  // Send the LINE ID token to your backend to exchange for a Firebase custom token
  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    // Note: do not send secrets from the client; lineIdToken is from user auth flow
    body: JSON.stringify({ lineIdToken }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Auth endpoint error: ${resp.status} ${resp.statusText} ${text}`);
  }

  const data: { firebaseCustomToken: string } = await resp.json();
  const token = data.firebaseCustomToken;
  if (!token) {
    throw new Error("Auth endpoint did not return firebaseCustomToken");
  }

  // Use the typed auth instance; getAuth(app) is also fine if you prefer
  const currentAuth = auth ?? getAuth(app);
  await signInWithCustomToken(currentAuth, token);
}
