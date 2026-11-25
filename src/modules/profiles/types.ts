import type { Role } from "@/platform/auth/types";

export type Profile = {
  userId: string;
  handle: string;
  displayName: string | null;
  isPublic: boolean;
  locale: string;
  timezone: string;
  createdAt: string;
  isGuest: boolean;
  roles: Role[];
};
