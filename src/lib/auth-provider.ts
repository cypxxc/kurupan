export type AuthProviderMode = "local" | "oidc";

function normalizeMode(value: string | undefined): AuthProviderMode {
  return value === "oidc" ? "oidc" : "local";
}

export function getServerAuthProviderMode(): AuthProviderMode {
  return normalizeMode(process.env.AUTH_PROVIDER);
}

export function getClientAuthProviderMode(): AuthProviderMode {
  return normalizeMode(process.env.NEXT_PUBLIC_AUTH_PROVIDER);
}
