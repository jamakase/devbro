import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users } from "./users.js";

export const servers = pgTable(
  "servers",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    host: text("host").notNull(),
    port: integer("port").notNull().default(22),
    username: text("username").notNull(),
    authType: text("auth_type").notNull(), // 'key' | 'agent'
    privateKey: text("private_key"),
    status: text("status").notNull().default("disconnected"),
    isDefault: boolean("is_default").notNull().default(false),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    lastConnectedAt: timestamp("last_connected_at"),
  },
  (table) => [unique("servers_user_host_port").on(table.userId, table.host, table.port)]
);

// Zod schemas
export const insertServerSchema = createInsertSchema(servers);
export const selectServerSchema = createSelectSchema(servers);
