import { z } from "zod";

export const oidcDiscoveryDocumentSchema = z.object({
  issuer: z.string().trim().min(1),
  authorization_endpoint: z.string().trim().min(1),
  token_endpoint: z.string().trim().min(1),
  jwks_uri: z.string().trim().min(1),
});

export const oidcTransactionPayloadSchema = z.object({
  state: z.string().trim().min(1),
  nonce: z.string().trim().min(1),
  codeVerifier: z.string().trim().min(1),
  nextPath: z.string().trim().min(1),
});

export const oidcTokenResponseSchema = z.object({
  access_token: z.string().trim().min(1).optional(),
  id_token: z.string().trim().min(1).optional(),
  token_type: z.string().trim().min(1).optional(),
  expires_in: z.number().finite().optional(),
});

export type OidcDiscoveryDocument = z.infer<typeof oidcDiscoveryDocumentSchema>;
export type OidcTransactionPayload = z.infer<typeof oidcTransactionPayloadSchema>;
export type OidcTokenResponse = z.infer<typeof oidcTokenResponseSchema>;
