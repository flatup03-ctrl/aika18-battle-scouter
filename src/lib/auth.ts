import { getAuth, signInWithCustomToken } from "firebase/auth";
import { app } from "./firebase";

export async function signInWithLine(lineIdToken: string) {
  const resp = await fetch(process.env.NEXT_PUBLIC_AUTH_ENDPOINT!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lineIdToken })
  });
  const { customToken } = await resp.json();
  const auth = getAuth(app);
  const cred = await signInWithCustomToken(auth, customToken);
  return cred.user;
}
