const header = document.querySelector('.site-header')
const reveals = document.querySelectorAll('.reveal')
const transcript = document.getElementById('transcript')
const composer = document.getElementById('composer')
const promptInput = document.getElementById('prompt')
const latencyEl = document.getElementById('latency')
const focusEl = document.getElementById('focus')
const canvas = document.getElementById('neural-canvas')
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const onScroll = () => {
  if (!header) return
  header.classList.toggle('is-scrolled', window.scrollY > 24)
}

onScroll()
window.addEventListener('scroll', onScroll, { passive: true })

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      }
    },
    { threshold: 0.16, rootMargin: '0px 0px -8% 0px' },
  )
  reveals.forEach((el) => observer.observe(el))
} else {
  reveals.forEach((el) => el.classList.add('is-visible'))
}

function reason(prompt) {
  const text = prompt.trim()
  const lower = text.toLowerCase()

  if (/launch|demo|weekend|product/.test(lower)) {
    return [
      'Sense: you want a shippable weekend demo, not a perfect product.',
      'Weigh: cut scope to one hero path users can feel in under two minutes.',
      'Speak: Ship a single story — setup, magic moment, payoff. Day 1: skeleton UI. Day 2: one delightful interaction. Day 3: polish + a 60-second walkthrough. Ignore secondary features until someone asks twice.',
    ]
  }

  if (/neural|network|build/.test(lower)) {
    return [
      'Sense: you want intuition before theory.',
      'Weigh: math can wait; the loop matters.',
      'Speak: A neural net is layered guesswork with feedback. Inputs become signals, weights bend those signals, an error score nudges the weights. Tonight: one tiny network (2 inputs → 2 hidden → 1 output), train it to learn XOR or a line, and watch the loss fall. Understanding arrives when the curve bends.',
    ]
  }

  if (/hour|priorit|focus|tonight/.test(lower)) {
    return [
      'Sense: one hour, high leverage, low ceremony.',
      'Weigh: unfinished open loops beat new ideas.',
      'Speak: Spend 10 minutes naming the single outcome that would make the hour a win. Spend 40 minutes only on that. Spend 10 minutes writing what remains. Protect the hour from inbox gravity — Meridian’s rule: one target, one pass.',
    ]
  }

  if (/hello|hi |hey|who are you|what are you/.test(lower)) {
    return [
      'Sense: greeting / identity check.',
      'Weigh: keep it human, keep it short.',
      'Speak: I’m Meridian — a demo AI system running locally in your browser. Ask for a plan, an explanation, or a sharper next move.',
    ]
  }

  return [
    `Sense: interpret “${text.slice(0, 72)}${text.length > 72 ? '…' : ''}” as a request for a clear next move.`,
    'Weigh: prefer a small irreversible step over a permanent maybe.',
    'Speak: Start by writing the outcome in one sentence. Then list the three blockers. Attack the blocker that unblocks the other two. When stuck, shrink the definition of done until motion returns.',
  ]
}

function addBubble(role, html, who) {
  const bubble = document.createElement('div')
  bubble.className = `bubble ${role}`
  bubble.innerHTML = `<span class="who">${who}</span><div class="body">${html}</div>`
  transcript.appendChild(bubble)
  transcript.scrollTop = transcript.scrollHeight
  return bubble
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function typeInto(el, text) {
  el.textContent = ''
  for (let i = 0; i < text.length; i += 1) {
    el.textContent += text[i]
    if (i % 3 === 0) await sleep(8)
  }
}

let busy = false

async function runPrompt(raw) {
  const prompt = raw.trim()
  if (!prompt || busy) return
  busy = true

  addBubble('user', `<p></p>`, 'You').querySelector('p').textContent = prompt
  promptInput.value = ''

  const thinking = addBubble('system', `<p class="thinking">Sensing…</p>`, 'Meridian')
  const steps = reason(prompt)
  const answer = steps[2].replace(/^Speak:\s*/, '')

  await sleep(420)
  thinking.querySelector('.body').innerHTML = `<p class="thinking">${steps[0]}</p>`
  if (latencyEl) latencyEl.textContent = `${28 + Math.floor(Math.random() * 40)}ms`
  if (focusEl) focusEl.textContent = (0.82 + Math.random() * 0.16).toFixed(2)

  await sleep(520)
  thinking.querySelector('.body').innerHTML = `<p class="thinking">${steps[0]}<br>${steps[1]}</p>`

  await sleep(480)
  const p = document.createElement('p')
  thinking.querySelector('.body').replaceChildren(p)
  await typeInto(p, answer)

  busy = false
  promptInput.focus()
}

composer?.addEventListener('submit', (event) => {
  event.preventDefault()
  runPrompt(promptInput.value)
})

document.querySelectorAll('[data-suggest]').forEach((button) => {
  button.addEventListener('click', () => {
    const value = button.getAttribute('data-suggest') || ''
    promptInput.value = value
    runPrompt(value)
  })
})

// Seed greeting
addBubble(
  'system',
  '<p>Meridian online. Try a suggestion below, or ask for a plan, an explanation, or a sharper next move.</p>',
  'Meridian',
)

function startNeuralField() {
  if (!canvas || reduceMotion) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  let width = 0
  let height = 0
  let nodes = []
  let raf = 0

  const resize = () => {
    width = canvas.width = window.innerWidth * devicePixelRatio
    height = canvas.height = window.innerHeight * devicePixelRatio
    canvas.style.width = `${window.innerWidth}px`
    canvas.style.height = `${window.innerHeight}px`
    const count = Math.floor((window.innerWidth * window.innerHeight) / 18000)
    nodes = Array.from({ length: Math.max(28, Math.min(count, 70)) }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25 * devicePixelRatio,
      vy: (Math.random() - 0.5) * 0.25 * devicePixelRatio,
      r: (1.2 + Math.random() * 1.8) * devicePixelRatio,
    }))
  }

  const draw = () => {
    ctx.clearRect(0, 0, width, height)

    for (const node of nodes) {
      node.x += node.vx
      node.y += node.vy
      if (node.x < 0 || node.x > width) node.vx *= -1
      if (node.y < 0 || node.y > height) node.vy *= -1
    }

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i]
        const b = nodes[j]
        const dx = a.x - b.x
        const dy = a.y - b.y
        const dist = Math.hypot(dx, dy)
        const max = 140 * devicePixelRatio
        if (dist < max) {
          const alpha = (1 - dist / max) * 0.28
          ctx.strokeStyle = `rgba(94, 234, 212, ${alpha})`
          ctx.lineWidth = 1 * devicePixelRatio
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }
    }

    for (const node of nodes) {
      ctx.fillStyle = 'rgba(245, 193, 108, 0.75)'
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2)
      ctx.fill()
    }

    raf = requestAnimationFrame(draw)
  }

  resize()
  draw()
  window.addEventListener('resize', resize, { passive: true })
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf)
    else raf = requestAnimationFrame(draw)
  })
}

startNeuralField()
