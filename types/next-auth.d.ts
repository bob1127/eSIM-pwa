import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
    };
    /** LINE／OAuth 首次建立帳號後短時間內為 true */
    isNewUser?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    newUserUntil?: number;
  }
}
