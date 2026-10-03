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
  return str
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
    if (line.trim() === '') html += '<p></p>'
    else html += `<p>${line}</p>`
  }
  if (inList) html += '</ul>'
  return html
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
  row.innerHTML = `
    <div class="avatar" aria-hidden="true">${role === 'user' ? 'U' : 'A'}</div>
    <div class="content ${streaming ? 'cursor-blink' : ''}">${
      role === 'assistant' ? formatMarkdownLite(content || ' ') : `<p>${escapeHtml(content)}</p>`
    }</div>
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

function replyFor(history) {
  const lastUser = [...history].reverse().find((m) => m.role === 'user')?.content || ''
  const lower = lastUser.toLowerCase()
  const prior = history.filter((m) => m.role === 'user').length

  if (/quantum/.test(lower)) {
    return `Quantum computing uses **qubits**, which can hold more than a simple on/off state at once.\n\nThink of a classical bit as a coin lying heads or tails. A qubit is more like a coin spinning — until you measure it, it carries a blend of possibilities.\n\nUseful intuition:\n- Classical computers try paths one by one\n- Quantum machines explore many amplitude-weighted paths together\n- Measurement collapses the result into a normal answer\n\nThey’re powerful for specific problems (chemistry, optimization, cryptography research), not a faster laptop for email.`
  }

  if (/email|feedback/.test(lower)) {
    return `Here’s a short, friendly draft you can send:\n\n**Subject:** Quick feedback on the project?\n\nHi [Name],\n\nHope you’re doing well. I’m wrapping up the current version of [project] and would love your eyes on it.\n\nIf you have 10–15 minutes this week, could you share what felt clear, what felt confusing, and anything you’d change first?\n\nNo pressure on timing — whenever works for you.\n\nThank you!\n[Your name]`
  }

  if (/workout|exercise|fitness/.test(lower)) {
    return `Here’s a simple **3-day beginner home plan** (about 30–35 minutes):\n\n**Day 1 — Full body**\n- Bodyweight squats × 10\n- Push-ups (knee OK) × 8\n- Glute bridges × 12\n- Plank × 20 seconds\n- Repeat 3 rounds\n\n**Day 2 — Move & core**\n- Reverse lunges × 8/side\n- Superman holds × 8\n- Dead bugs × 10/side\n- Side plank × 15 sec/side\n- Repeat 3 rounds\n\n**Day 3 — Light strength**\n- Chair squats × 12\n- Wall push-ups × 10\n- Hip hinges × 12\n- March in place × 60 seconds\n- Repeat 3 rounds\n\nRest 60–90 seconds between rounds. Stop if anything hurts sharply.`
  }

  if (/coffee|name|brainstorm/.test(lower)) {
    return `Here are coffee shop name ideas in a few lanes:\n\n**Warm & cozy**\n- Hearth & Bean\n- Soft Pour\n- Copper Mug\n\n**Modern & clean**\n- North Roast\n- Kiln Coffee\n- Field Theory\n\n**Playful**\n- Sip Theory\n- Bean There\n- Daily Drift\n\nIf you tell me the neighborhood vibe (quiet study / loud social / outdoor patio), I can narrow to a top 5.`
  }

  if (/hello|hi\b|hey|who are you/.test(lower)) {
    return `Hey — I’m **Aria**, a ChatGPT-style chat demo running locally in your browser.\n\nI can help with writing, planning, explanations, brainstorming, and more. What do you want to work on?`
  }

  if (/code|javascript|python|html/.test(lower)) {
    return `I can help with that.\n\nA practical way to start:\n1. Define the exact outcome (what should work when you’re done)\n2. Write the smallest version that proves it\n3. Add only the next missing piece\n\nPaste your code or describe the bug/feature, and I’ll give a concrete fix or snippet.`
  }

  // Multi-turn awareness
  if (prior > 1) {
    return `Got it — building on what you just said.\n\n**My take:** ${lastUser.slice(0, 140)}${lastUser.length > 140 ? '…' : ''}\n\nNext move:\n1. Clarify the goal in one sentence\n2. Choose the smallest useful deliverable\n3. Do that first, then iterate\n\nIf you share constraints (time, tools, audience), I’ll make this more specific.`
  }

  return `Here’s a clear answer:\n\n**${lastUser.slice(0, 80)}${lastUser.length > 80 ? '…' : ''}**\n\nI’d approach it like this:\n1. Restate the goal in one line\n2. List the top 3 constraints\n3. Take the smallest step that creates progress today\n\nIf you want, I can turn this into a checklist, a draft, or a step-by-step plan — just tell me the format.`
}

async function streamInto(chat, content) {
  const row = messageEl('assistant', '', true)
  thread.appendChild(row)
  const contentEl = row.querySelector('.content')
  let out = ''

  for (let i = 0; i < content.length; i += 1) {
    out += content[i]
    contentEl.innerHTML = formatMarkdownLite(out)
    contentEl.classList.add('cursor-blink')
    thread.scrollTop = thread.scrollHeight
    if (i % 2 === 0) await new Promise((r) => setTimeout(r, 7 + Math.random() * 10))
  }

  contentEl.classList.remove('cursor-blink')
  chat.messages.push({ role: 'assistant', content: out })
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

  const answer = replyFor(chat.messages)
  await streamInto(chat, answer)

  busy = false
  sendBtn.disabled = false
  renderSidebar()
  promptEl.focus()
})

render()
promptEl.focus()
