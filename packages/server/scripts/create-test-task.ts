
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { tasks, projects, users } from "../src/db/schema/index.js";
import { randomUUID } from "crypto";

const DATABASE_URL = "postgresql://postgres:postgres@localhost:7777/agent_sandbox";
const SERVER_ID = "ac534fb3-a832-4627-a92f-c4ca6b677b8e";

async function main() {
  const client = postgres(DATABASE_URL);
  const db = drizzle(client);

  try {
    // Get user
    const userList = await db.select().from(users).limit(1);
    if (userList.length === 0) {
      throw new Error("No user found. Run create-test-server.ts first.");
    }
    const user = userList[0];

    // Create project
    const projectId = randomUUID();
    console.log("Creating test project...");
    await db.insert(projects).values({
      id: projectId,
      userId: user.id,
      name: "Test Project",
      description: "A project for testing CLI agents"
    });

    const taskId = randomUUID();
    console.log("Creating test task...");
    
    await db.insert(tasks).values({
      id: taskId,
      projectId: projectId,
      name: "Hello World Task",
      status: "pending",
      cliTool: "opencode", 
      serverId: SERVER_ID,
      config: {
        prompt: "echo 'Hello World'",
        cpuLimit: "2",
        memoryLimit: "1g"
      }
    });

    console.log("TASK_ID=" + taskId);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

main();
