import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  linkSocial,
} = authClient;

// Helper function for GitHub sign in/sign up
export async function signInWithGitHub() {
  return signIn.social({
    provider: "github",
    callbackURL: "/",
  });
}

// Helper function to link GitHub to existing account
export async function linkGitHubAccount() {
  return linkSocial({
    provider: "github",
    callbackURL: "/settings",
  });
}
