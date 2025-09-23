import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import { archiver } from "../../src/lib/archiver";

const TMP = path.join(process.cwd(), "logs-test");

async function rmrf(p: string) {
  try { await fs.rm(p, { recursive: true, force: true }); } catch {}
}
async function mkdirp(p: string) {
  try { await fs.mkdir(p, { recursive: true }); } catch {}
}

describe("filesystem archiver", () => {
  beforeEach(async () => {
    await rmrf(TMP);
    await mkdirp(TMP);
    // @ts-ignore override private for test context
    (archiver as any).logsDir = TMP;
    // Ensure path still exists after override
    await mkdirp((archiver as any).logsDir);
  });

  afterEach(async () => {
    await rmrf(TMP);
  });

  it("writes conversation logs", async () => {
    await archiver.logConversation({
      sessionId: "test-session",
      messages: [{ role: "user", content: "hello", timestamp: Date.now() }],
      trustLevel: 50,
      skepticMode: false,
      artifactsGenerated: 1
    });
    const files = await fs.readdir(TMP);
    const file = files.find(f => f.startsWith("conversations_"));
    expect(file).toBeTruthy();
    const content = JSON.parse(await fs.readFile(path.join(TMP, file!), "utf8"));
    expect(Array.isArray(content)).toBe(true);
    expect(content[0]?.sessionId).toBe("test-session");
    expect(content[0]?.conversationLength).toBe(1);
  });

  it("writes artifact logs", async () => {
    await archiver.logArtifact({
      sessionId: "test-session",
      userInput: "make a template",
      artifactContent: "TOOL CONTENT",
      generationTime: 123
    });
    const files = await fs.readdir(TMP);
    const file = files.find(f => f.startsWith("artifacts_"));
    expect(file).toBeTruthy();
    const content = JSON.parse(await fs.readFile(path.join(TMP, file!), "utf8"));
    expect(Array.isArray(content)).toBe(true);
    expect(content[0]?.sessionId).toBe("test-session");
    expect(content[0]?.generationTime).toBe(123);
  });
});
