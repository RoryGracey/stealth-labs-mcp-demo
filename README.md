# Stealth Labs Technical Interview Demo

## Description
This repository covers the mock Python `mcp` server which queries a `.json` file with fake defence related incidents. Additionally, the NextJS site hosts a chat window for the user to query the fake defence related incidents by utilising OpenAI's API alongside the `mcp` server to pull and view documents.

## Quickstart Intructions

**Run MCP Server**
```bash
# Go to Python MCP Server Directory from root of project
cd sl-python-mcp

# Install Python UV
curl -LsSf https://astral.sh/uv/install.sh | sh

# Run MCP Server
uv run python main.py
```

**Run NextJS Site**
```bash
# Go to NextJS site from root of project
cd sl-nextjs

# Create .env file
touch .env

# Edit .env with OPENAI_API_KEY and MCP_URL environment variables
vim .env 

# Install dependencies
npm i

# Run dev server
npm run dev
```

***PLEASE NOTE - Environment variables must be inserted into .env in root of NextJS Directory and the MCP Server must be running in order to use the NextJS Chat.***
