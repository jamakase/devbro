import { eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import type { User } from "@agent-sandbox/shared";

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    const result = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return result[0] ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await db.select().from(schema.users).where(eq(schema.users.email, email));
    return result[0] ?? null;
  }

  async findAll(): Promise<User[]> {
    return db.select().from(schema.users);
  }
}
