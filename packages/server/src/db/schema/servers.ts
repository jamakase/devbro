import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  unique,
  json,
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
    type: text("type").notNull().default("ssh"), // 'ssh' | 'registered'
    host: text("host").notNull(), // Hostname or IP (for SSH), or reported IP (for Registered)
    port: integer("port").default(22),
    username: text("username"),
    authType: text("auth_type"), // 'key' | 'agent'
    privateKey: text("private_key"),
    token: text("token"), // For registered servers
    metadata: json("metadata"), // Extra info (e.g. K8s context, labels)
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
