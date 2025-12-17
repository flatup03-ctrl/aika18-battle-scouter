import { GoogleAuth, AuthClient } from 'google-auth-library';

export async function getGoogleAuthFromEnv(scopes: string[] = ['https://www.googleapis.com/auth/cloud-platform']): Promise<GoogleAuth> {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!raw) throw new Error('Missing environment variable GOOGLE_APPLICATION_CREDENTIALS_JSON');

  const decoded = Buffer.from(raw, 'base64').toString('utf-8');

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(decoded);
  } catch {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON could not be parsed after Base64 decoding. Is it valid JSON?');
  }
  return new GoogleAuth({ credentials: json as any, scopes });
}

export async function getAuthClientFromEnv(scopes: string[] = ['https://www.googleapis.com/auth/cloud-platform']): Promise<AuthClient> {
  const auth = await getGoogleAuthFromEnv(scopes);
  return auth.getClient();
}

export function requireProjectId(): string {
  const pid = process.env.GOOGLE_PROJECT_ID;
  if (!pid) throw new Error('Missing environment variable GOOGLE_PROJECT_ID');
  return pid;
}
