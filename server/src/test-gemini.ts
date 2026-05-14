import 'dotenv/config'
import { streamChat, generateCompletion } from './lib/openai.js'

async function testGemini() {
  console.log('=== Testing Gemini API Connection ===\n')

  // Test 1: Non-streaming completion
  console.log('[Test 1] Non-streaming completion...')
  try {
    const result = await generateCompletion([
      { role: 'system', content: '你是一位有深度的对话主持人。请简短回复。' },
      { role: 'user', content: '你好，我想聊聊AI对创作的影响' },
    ])
    console.log('[OK] Response:', result.slice(0, 200), '\n')
  } catch (err) {
    console.error('[FAIL]', (err as Error).message, '\n')
  }

  // Test 2: Streaming
  console.log('[Test 2] Streaming response...')
  try {
    let output = ''
    for await (const chunk of streamChat([
      { role: 'system', content: '你是一位访谈主持人。请用一句话回复。' },
      { role: 'user', content: '什么是好的对话？' },
    ])) {
      output += chunk
      process.stdout.write(chunk)
    }
    console.log('\n[OK] Stream completed, length:', output.length, '\n')
  } catch (err) {
    console.error('[FAIL]', (err as Error).message, '\n')
  }

  console.log('=== Tests Complete ===')
  process.exit(0)
}

testGemini()
