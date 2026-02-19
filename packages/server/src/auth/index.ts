import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/client.js";
import * as schema from "../db/schema/index.js";

// GitHub OAuth configuration - optional, features disabled if not provided
const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

export const isGitHubOAuthEnabled = !!(githubClientId && githubClientSecret);

if (!isGitHubOAuthEnabled) {
  console.warn("[Auth] GitHub OAuth is disabled - GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET not provided");
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  socialProviders: isGitHubOAuthEnabled
    ? {
        github: {
          clientId: githubClientId!,
          clientSecret: githubClientSecret!,
          scope: ["repo", "read:user"],
        },
      }
    : undefined,
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
});

export type Auth = typeof auth;
