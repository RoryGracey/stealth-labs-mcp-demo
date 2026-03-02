import { createMCPClient } from '@ai-sdk/mcp';

export async function makeDefenceMcpClient() {
  const url = process.env.MCP_URL!;
  return createMCPClient({
    transport: {
      type: 'http',
      url,
    },
  });
}