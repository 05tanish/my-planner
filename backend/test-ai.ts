import 'dotenv/config';
import { aiService } from './src/services/ai.service';
import { env } from './src/config/env';

async function test() {
  try {
    const res = await aiService.generateContent("Explain Binary Search in 1 sentence.");
    console.log("SUCCESS:", res);
  } catch (err: any) {
    console.error("FAIL:", err.message);
  }
}
test();
