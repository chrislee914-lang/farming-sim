import 'dotenv/config'
import express from 'express'
import OpenAI from 'openai'

const app = express()
const port = Number(process.env.PORT || 3001)

app.use(express.json({ limit: '1mb' }))

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

const SYSTEM_PROMPT = `You are Aria, a helpful ChatGPT-style assistant.
Be clear, useful, and concise unless the user asks for depth.
Always structure your reply exactly like this:

### Reasoning
(Brief step-by-step thinking: what the user wants, key constraints, and how you chose the approach. 2-6 short bullets or sentences.)

### Answer
(The user-facing answer. Use markdown: short paragraphs, bullets, and bold where helpful.)`

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    openai: Boolean(openai),
    model: MODEL,
  })
})

app.post('/api/chat', async (req, res) => {
  if (!openai) {
    res.status(503).json({
      error:
        'OpenAI is not configured. Add OPENAI_API_KEY as a secret or in a .env file, then restart the server.',
    })
    return
  }

  const messages = Array.isArray(req.body?.messages) ? req.body.messages : null
  if (!messages?.length) {
    res.status(400).json({ error: 'messages array is required' })
    return
  }

  const cleaned = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }))
    .slice(-20)

  if (!cleaned.length) {
    res.status(400).json({ error: 'No valid messages provided' })
    return
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  try {
    send('status', { model: MODEL, phase: 'thinking' })

    const stream = await openai.chat.completions.create({
      model: MODEL,
      stream: true,
      temperature: 0.7,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...cleaned],
    })

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content
      if (delta) send('token', { text: delta })
    }

    send('done', { ok: true })
    res.end()
  } catch (err) {
    const message = err?.message || 'OpenAI request failed'
    send('error', { error: message })
    res.end()
  }
})

app.listen(port, '0.0.0.0', () => {
  console.log(`Aria API on http://0.0.0.0:${port} (openai=${Boolean(openai)} model=${MODEL})`)
})
