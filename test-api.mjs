import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import fs from 'fs';

// Read the .env.local file manually
const envFile = fs.readFileSync('.env.local', 'utf8');
const apiKey = envFile.match(/ANTHROPIC_API_KEY=(.+)/)?.[1]?.trim();

process.env.ANTHROPIC_API_KEY = apiKey;

async function test() {
  try {
    console.log('Testing with API key:', apiKey.substring(0, 20) + '...');
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-20250514"), // Updated model
      prompt: "Say hello"
    });
    console.log("Success:", text);
  } catch (error) {
    console.error("Error:", error);
  }
}

test();
