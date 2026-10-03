const STORAGE_KEY = 'aria-chats-v1'

const sidebar = document.getElementById('sidebar')
const backdrop = document.getElementById('backdrop')
const openSidebar = document.getElementById('open-sidebar')
const closeSidebar = document.getElementById('close-sidebar')
const chatList = document.getElementById('chat-list')
const newChatBtn = document.getElementById('new-chat')
const thread = document.getElementById('thread')
const empty = document.getElementById('empty')
const composer = document.getElementById('composer')
const promptEl = document.getElementById('prompt')
const sendBtn = document.getElementById('send')
const modelLabel = document.getElementById('model-label')

/** @type {{id:string,title:string,messages:{role:'user'|'assistant',content:string}[]}[]} */
let chats = loadChats()
let activeId = chats[0]?.id || null
let busy = false

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function loadChats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveChats() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats))
}

function activeChat() {
  return chats.find((c) => c.id === activeId) || null
}

function ensureChat() {
  let chat = activeChat()
  if (chat) return chat
  chat = { id: uid(), title: 'New chat', messages: [] }
  chats.unshift(chat)
  activeId = chat.id
  saveChats()
  return chat
}

function setSidebar(open) {
  sidebar.classList.toggle('is-open', open)
  backdrop.hidden = !open
}

openSidebar?.addEventListener('click', () => setSidebar(true))
closeSidebar?.addEventListener('click', () => setSidebar(false))
backdrop?.addEventListener('click', () => setSidebar(false))

async function refreshHealth() {
  try {
    const res = await fetch('/api/health')
    const data = await res.json()
    if (!data.openai) {
      modelLabel.textContent = 'OpenAI key missing'
      modelLabel.parentElement.title = 'Add OPENAI_API_KEY and restart'
      return
    }
    modelLabel.textContent = data.model || 'OpenAI'
    modelLabel.parentElement.title = 'Connected to OpenAI'
  } catch {
    modelLabel.textContent = 'API offline'
  }
}

function renderSidebar() {
  chatList.innerHTML = ''
  if (!chats.length) {
    const hint = document.createElement('p')
    hint.className = 'fineprint'
    hint.style.padding = '0.5rem'
    hint.textContent = 'No chats yet'
    chatList.appendChild(hint)
    return
  }

  for (const chat of chats) {
    const row = document.createElement('div')
    row.className = `chat-item${chat.id === activeId ? ' is-active' : ''}`

    const titleBtn = document.createElement('button')
    titleBtn.type = 'button'
    titleBtn.innerHTML = `<span>${escapeHtml(chat.title)}</span>`
    titleBtn.style.all = 'unset'
    titleBtn.style.cursor = 'pointer'
    titleBtn.style.overflow = 'hidden'
    titleBtn.style.textOverflow = 'ellipsis'
    titleBtn.style.whiteSpace = 'nowrap'
    titleBtn.addEventListener('click', () => {
      activeId = chat.id
      setSidebar(false)
      render()
    })

    const del = document.createElement('button')
    del.className = 'delete'
    del.type = 'button'
    del.setAttribute('aria-label', 'Delete chat')
    del.textContent = '⌫'
    del.addEventListener('click', (e) => {
      e.stopPropagation()
      chats = chats.filter((c) => c.id !== chat.id)
      if (activeId === chat.id) activeId = chats[0]?.id || null
      saveChats()
      render()
    })

    row.append(titleBtn, del)
    chatList.appendChild(row)
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function formatMarkdownLite(text) {
  const escaped = escapeHtml(text)
  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  const lines = withBold.split('\n')
  let html = ''
  let inList = false

  for (const line of lines) {
    const bullet = line.match(/^[-•]\s+(.*)/)
    const numbered = line.match(/^\d+\.\s+(.*)/)
    if (bullet || numbered) {
      if (!inList) {
        html += '<ul>'
        inList = true
      }
      html += `<li>${bullet ? bullet[1] : numbered[1]}</li>`
      continue
    }
    if (inList) {
      html += '</ul>'
      inList = false
    }
    if (line.trim() === '') continue
    html += `<p>${line}</p>`
  }
  if (inList) html += '</ul>'
  return html || '<p></p>'
}

function splitReasoning(raw) {
  const text = raw || ''
  const match = text.match(/###\s*Reasoning\s*([\s\S]*?)(?:###\s*Answer\s*([\s\S]*))?$/i)
  if (match) {
    return {
      reasoning: match[1].trim(),
      answer: (match[2] || '').trim() || text.replace(/###\s*Reasoning[\s\S]*/i, '').trim(),
    }
  }
  const answerOnly = text.match(/###\s*Answer\s*([\s\S]*)/i)
  if (answerOnly) return { reasoning: '', answer: answerOnly[1].trim() }
  return { reasoning: '', answer: text.trim() }
}

function renderAssistantHtml(raw, streaming = false) {
  const { reasoning, answer } = splitReasoning(raw)
  const reasoningOpen = streaming && !answer ? ' open' : ''
  const reasoningBlock = reasoning
    ? `<details class="reasoning"${reasoningOpen}><summary>Reasoning</summary><div class="reasoning-body">${formatMarkdownLite(reasoning)}</div></details>`
    : streaming
      ? `<details class="reasoning" open><summary>Reasoning</summary><div class="reasoning-body"><p>Thinking…</p></div></details>`
      : ''
  const answerBlock = `<div class="answer">${formatMarkdownLite(answer || (streaming ? '' : raw))}</div>`
  return `${reasoningBlock}${answerBlock}`
}

function renderThread() {
  const chat = activeChat()
  const hasMessages = Boolean(chat?.messages?.length)
  empty.hidden = hasMessages
  thread.hidden = !hasMessages
  thread.innerHTML = ''
  if (!hasMessages) return

  for (const message of chat.messages) {
    thread.appendChild(messageEl(message.role, message.content))
  }
  thread.scrollTop = thread.scrollHeight
}

function messageEl(role, content, streaming = false) {
  const row = document.createElement('article')
  row.className = `msg ${role}`
  const body =
    role === 'assistant'
      ? renderAssistantHtml(content || '', streaming)
      : `<p>${escapeHtml(content)}</p>`
  row.innerHTML = `
    <div class="avatar" aria-hidden="true">${role === 'user' ? 'U' : 'A'}</div>
    <div class="content ${streaming ? 'cursor-blink' : ''}">${body}</div>
  `
  return row
}

function render() {
  renderSidebar()
  renderThread()
  autoGrow()
}

function autoGrow() {
  promptEl.style.height = 'auto'
  promptEl.style.height = `${Math.min(promptEl.scrollHeight, 160)}px`
}

promptEl.addEventListener('input', autoGrow)

promptEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    composer.requestSubmit()
  }
})

newChatBtn.addEventListener('click', () => {
  const chat = { id: uid(), title: 'New chat', messages: [] }
  chats.unshift(chat)
  activeId = chat.id
  saveChats()
  setSidebar(false)
  render()
  promptEl.focus()
})

document.querySelectorAll('[data-starter]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const text = btn.getAttribute('data-starter') || ''
    promptEl.value = text
    autoGrow()
    composer.requestSubmit()
  })
})

function titleFrom(text) {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > 36 ? `${clean.slice(0, 36)}…` : clean || 'New chat'
}

async function streamFromOpenAI(chat) {
  const row = messageEl('assistant', '', true)
  thread.appendChild(row)
  const contentEl = row.querySelector('.content')
  let out = ''

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: chat.messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  })

  if (!res.ok) {
    let message = 'OpenAI request failed'
    try {
      const data = await res.json()
      message = data.error || message
    } catch {
      // ignore
    }
    contentEl.innerHTML = `<p class="error">${escapeHtml(message)}</p>`
    contentEl.classList.remove('cursor-blink')
    chat.messages.push({ role: 'assistant', content: `Error: ${message}` })
    saveChats()
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() || ''

    for (const part of parts) {
      const lines = part.split('\n')
      let event = 'message'
      let dataLine = ''
      for (const line of lines) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        if (line.startsWith('data:')) dataLine += line.slice(5).trim()
      }
      if (!dataLine) continue
      let data
      try {
        data = JSON.parse(dataLine)
      } catch {
        continue
      }

      if (event === 'token' && data.text) {
        out += data.text
        contentEl.innerHTML = renderAssistantHtml(out, true)
        contentEl.classList.add('cursor-blink')
        thread.scrollTop = thread.scrollHeight
      }

      if (event === 'error') {
        contentEl.innerHTML = `<p class="error">${escapeHtml(data.error || 'OpenAI error')}</p>`
        contentEl.classList.remove('cursor-blink')
        chat.messages.push({ role: 'assistant', content: `Error: ${data.error || 'OpenAI error'}` })
        saveChats()
        return
      }
    }
  }

  contentEl.innerHTML = renderAssistantHtml(out, false)
  contentEl.classList.remove('cursor-blink')
  chat.messages.push({ role: 'assistant', content: out || 'No response received.' })
  saveChats()
}

composer.addEventListener('submit', async (e) => {
  e.preventDefault()
  const text = promptEl.value.trim()
  if (!text || busy) return

  const chat = ensureChat()
  if (chat.messages.length === 0) chat.title = titleFrom(text)

  chat.messages.push({ role: 'user', content: text })
  saveChats()
  promptEl.value = ''
  autoGrow()
  render()

  busy = true
  sendBtn.disabled = true
  empty.hidden = true
  thread.hidden = false

  try {
    await streamFromOpenAI(chat)
  } catch (err) {
    const row = messageEl('assistant', '')
    row.querySelector('.content').innerHTML = `<p class="error">${escapeHtml(err.message || 'Network error')}</p>`
    thread.appendChild(row)
    chat.messages.push({ role: 'assistant', content: `Error: ${err.message || 'Network error'}` })
    saveChats()
  }

  busy = false
  sendBtn.disabled = false
  renderSidebar()
  promptEl.focus()
})

render()
refreshHealth()
promptEl.focus()
