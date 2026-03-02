import { NextResponse } from 'next/server';
import { makeDefenceMcpClient } from '@/lib/mcp';
import { MCPClient } from '@ai-sdk/mcp';

interface McpTextContent {
  type: 'text';
  text: string;
}

interface McpToolResult {
  content?: McpTextContent[];
  isError?: boolean;
}
interface McpClient { callTool(options: { name: string; arguments: Record<string, unknown> }): Promise<unknown>; close(): Promise<void>; }

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const classificationMax = (url.searchParams.get('classificationMax') ?? 'SECRET') as
    | 'UNCLASSIFIED'
    | 'RESTRICTED'
    | 'SECRET';

  const mcpClient = await makeDefenceMcpClient();
  try {
    const raw = await (mcpClient as unknown as McpClient).callTool({
      name: 'def_list_entries',
      arguments: { classification_max: classificationMax },
    }) as McpToolResult;

    if (raw.isError) {
      return NextResponse.json({ error: 'mcp_tool_error', raw }, { status: 502 });
    }

    const textBlock = raw.content?.find(c => c.type === 'text')?.text;
    if (!textBlock) {
      return NextResponse.json({ error: 'no_text_content', raw }, { status: 502 });
    }

    const data = JSON.parse(textBlock);

    return NextResponse.json(data);
  } finally {
    await mcpClient.close();
  }
}