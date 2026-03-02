import { z } from 'zod';
import { streamText, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import { makeDefenceMcpClient } from '@/lib/mcp';

export const runtime = 'nodejs';

const BodySchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string(),
    }),
  ),
  classificationMax: z.enum(['UNCLASSIFIED', 'RESTRICTED', 'SECRET']).default('SECRET'),
});

export async function POST(req: Request) {
  const body = BodySchema.parse(await req.json());

  const mcpClient = await makeDefenceMcpClient();
  const tools = await mcpClient.tools();

  const result = await streamText({
    model: openai('gpt-5-mini'),
    messages: [
      {
        role: 'system',
        content:
          `You are an analyst assistant. Use MCP tools to search/retrieve entries when needed. ` +
          `After tool calls, you MUST provide a final answer and cite entry ids.`,
      },
      ...body.messages,
    ],
    tools,
    stopWhen: stepCountIs(8),

    onStepFinish: (step) => {
      console.log('toolCalls:', step.toolCalls);
      console.log('toolResults:', step.toolResults);
      console.log('text:', step.text);
    },

    onFinish: async () => {
      await mcpClient.close();
    },

    onError: async (err) => {
      console.error('streamText error:', err);
      await mcpClient.close();
    },
  });

  return result.toTextStreamResponse();
}