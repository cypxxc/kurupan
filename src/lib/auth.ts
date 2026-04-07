export type SessionUser = {
  id: string;
  role: "admin" | "staff" | "borrower";
};

export async function getSessionUser(): Promise<SessionUser | null> {
  return null;
}
