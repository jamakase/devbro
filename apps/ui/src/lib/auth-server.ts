import { auth } from "@agent-sandbox/server";
import { headers } from "next/headers";

export async function getServerSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function requireAuth() {
  const session = await getServerSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}
