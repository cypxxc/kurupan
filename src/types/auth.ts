export type Role = "borrower" | "staff" | "admin";

export type ActorContext = {
  externalUserId: string;
  role: Role;
  fullName?: string;
  email?: string | null;
  employeeCode?: string | null;
  department?: string | null;
};

export type SessionRecord = {
  id: string;
  externalUserId: string;
  effectiveRole: Role;
  createdAt: Date;
  expiresAt: Date;
};
