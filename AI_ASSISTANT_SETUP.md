# AI Assistant Setup Guide

## Groq API Configuration

To use the AI Assistant with Groq GPT-OSS-120B model, you need to:

1. **Get a Groq API Key**:
   - Visit: https://console.groq.com/keys
   - Sign up/login to Groq
   - Create a new API key

2. **Set Environment Variable**:
   Create a `.env.local` file in your project root with:
   ```
   GROQ_API_KEY=your_actual_groq_api_key_here
   ```

3. **Restart the Development Server**:
   ```bash
   npm run dev
   ```

## Features

- **Windows Command Generation**: Ask questions like "print all folders in cwd" and get Windows PowerShell/CMD commands
- **Auto-Execution**: Commands are automatically executed on selected bots
- **Real-time Output**: See command results directly in the chat
- **Bot Selection**: Choose which bot to execute commands on
- **Polling System**: Automatically retrieves command output

## Example Queries

- "print all folders in cwd" → `Get-ChildItem -Directory`
- "show running processes" → `Get-Process`
- "check disk space" → `Get-WmiObject -Class Win32_LogicalDisk`
- "list network connections" → `netstat -an`
- "show system info" → `Get-ComputerInfo`
- "list installed programs" → `Get-WmiObject -Class Win32_Product`

## How It Works

1. You ask a question in natural language
2. Groq GPT-OSS-120B generates the appropriate Windows command
3. The command is displayed in the chat
4. If a bot is selected, the command is automatically executed
5. Results are polled and displayed in real-time
