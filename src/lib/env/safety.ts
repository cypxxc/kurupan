export function isProductionEnvironment() {
  return process.env.APP_ENV === "production" || process.env.NODE_ENV === "production";
}

export function assertNotProductionEnvironment(action: string) {
  if (isProductionEnvironment()) {
    throw new Error(`${action} is blocked in production environments.`);
  }
}
