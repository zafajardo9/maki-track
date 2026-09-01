const makiAppUrl = (
  process.env.NEXT_PUBLIC_MAKI_APP_URL ?? "http://localhost:5173"
).replace(/\/+$/, "");

export const MAKI_APP_URL = makiAppUrl;
export const MAKI_SIGN_IN_URL = `${makiAppUrl}/auth/sign-in`;
export const MAKI_SIGN_UP_URL = `${makiAppUrl}/auth/sign-up`;
