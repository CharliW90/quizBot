import { describe, it, expect, vi } from "vitest";
import command from "./ping.js";

function mockInteraction(wsPing: number, replyTimestamp: number, interactionTimestamp: number) {
  return {
    reply: vi.fn(async () => ({ createdTimestamp: replyTimestamp })),
    editReply: vi.fn(),
    createdTimestamp: interactionTimestamp,
    client: { ws: { ping: wsPing } },
  } as any;
}

describe("/ping", () => {
  it("has correct metadata", () => {
    expect(command.data.name).toBe("ping");
    expect(command.data.description).toBe("Check if the bot is responsive");
  });

  it("replies with latency values", async () => {
    const interaction = mockInteraction(45, 1000, 900);

    await command.execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: "Pinging...",
      ephemeral: true,
      fetchReply: true,
    });
    expect(interaction.editReply).toHaveBeenCalledWith(
      "Pong! Latency: **100ms** | WebSocket: **45ms**"
    );
  });
});
