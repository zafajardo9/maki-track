export function isCloud(): boolean {
  return process.env.MAKI_CLOUD === "true";
}
