import { randomUUID } from "crypto";
import { eq, lt, desc, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { messages } from "../db/schema/index.js";
import type {
  Message,
  MessageRole,
  CreateMessageInput,
  ToolCall,
} from "@agent-sandbox/shared";

export class MessageRepository {
  async create(input: CreateMessageInput): Promise<Message> {
    const id = randomUUID();
    const now = new Date();

    const result = await db
      .insert(messages)
      .values({
        id,
        taskId: input.taskId,
        role: input.role,
        content: input.content,
        toolCalls: input.toolCalls ?? null,
        timestamp: now,
      })
      .returning();

    return this.mapRow(result[0]!);
  }

  async findByTaskId(
    taskId: string,
    options?: { limit?: number; before?: string }
  ): Promise<Message[]> {
    const limit = options?.limit ?? 50;

    let query = db
      .select()
      .from(messages)
      .where(eq(messages.taskId, taskId))
      .orderBy(desc(messages.timestamp))
      .limit(limit);

    // If "before" is specified, get messages before that message's timestamp
    if (options?.before) {
      const beforeMessage = await db
        .select({ timestamp: messages.timestamp })
        .from(messages)
        .where(eq(messages.id, options.before));

      if (beforeMessage[0]) {
        query = db
          .select()
          .from(messages)
          .where(
            and(
              eq(messages.taskId, taskId),
              lt(messages.timestamp, beforeMessage[0].timestamp)
            )
          )
          .orderBy(desc(messages.timestamp))
          .limit(limit);
      }
    }

    const result = await query;
    // Reverse to get chronological order
    return result.map(this.mapRow).reverse();
  }

  async findById(id: string): Promise<Message | null> {
    const result = await db
      .select()
      .from(messages)
      .where(eq(messages.id, id));
    return result[0] ? this.mapRow(result[0]) : null;
  }

  async deleteByTaskId(taskId: string): Promise<number> {
    const result = await db
      .delete(messages)
      .where(eq(messages.taskId, taskId))
      .returning();
    return result.length;
  }

  private mapRow(row: typeof messages.$inferSelect): Message {
    return {
      id: row.id,
      taskId: row.taskId,
      role: row.role as MessageRole,
      content: row.content,
      toolCalls: row.toolCalls as ToolCall[] | null,
      timestamp: row.timestamp,
    };
  }
}
