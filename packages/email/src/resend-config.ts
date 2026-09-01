type ResendEnv = Record<string, string | undefined>;

/**
 * Whether outgoing mail can be sent at all. Resend only needs an API key;
 * `RESEND_FROM` is optional because the SDK still falls back to Resend's
 * sandbox sender, which is enough for local development.
 */
export function isResendConfigured(env: ResendEnv = process.env): boolean {
  return Boolean(env.RESEND_API_KEY);
}

/**
 * The envelope sender. Must use a domain verified in the Resend account for
 * production delivery; the default is Resend's sandbox sender, which only
 * delivers to the account owner's email address.
 */
export function getResendSender(env: ResendEnv = process.env): string {
  return env.RESEND_FROM || "Maki <onboarding@resend.dev>";
}
