import { TaskRepository, MessageRepository } from "@agent-sandbox/server";
import { requireAuth } from "@/lib/auth-server";

const taskRepo = new TaskRepository();
const messageRepo = new MessageRepository();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  const { id: taskId } = await params;

  const task = await taskRepo.getTaskWithOwnerCheck(taskId, session.user.id);
  if (!task) {
    return new Response("Task not found", { status: 404 });
  }

  const url = new URL(request.url);
  const lastEventId = request.headers.get("last-event-id");
  const resumeFrom = url.searchParams.get("after") || lastEventId || "";

  let lastSeen = resumeFrom;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (data: string) => {
        controller.enqueue(encoder.encode(data));
      };

      send("event: ready\ndata: {}\n\n");

      const tick = async () => {
        if (closed) return;
        try {
          const messages = await messageRepo.findByTaskId(taskId, { limit: 200 });
          const promptMessages = messages.filter((m) =>
            (m.toolCalls ?? []).some((tc) => tc.type === "prompt")
          );

          const newOnes = lastSeen
            ? promptMessages.filter((m) => m.id > lastSeen)
            : promptMessages;

          for (const msg of newOnes) {
            lastSeen = msg.id;
            send(`id: ${msg.id}\n`);
            send(`event: prompt\n`);
            send(`data: ${JSON.stringify(msg)}\n\n`);
          }

          send("event: ping\ndata: {}\n\n");
        } catch {
          send("event: ping\ndata: {}\n\n");
        }
      };

      const interval = setInterval(() => {
        void tick();
      }, 2000);

      tick().catch(() => {});

      const abortHandler = () => {
        closed = true;
        clearInterval(interval);
        controller.close();
      };

      if (request.signal.aborted) {
        abortHandler();
        return;
      }
      request.signal.addEventListener("abort", abortHandler, { once: true });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
