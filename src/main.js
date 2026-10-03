const header = document.querySelector('.site-header')
const reveals = document.querySelectorAll('.reveal')
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
    { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
  )

  reveals.forEach((el) => observer.observe(el))
} else {
  reveals.forEach((el) => el.classList.add('is-visible'))
}

function createWaltz(dancer) {
  const frames = [...dancer.querySelectorAll('[data-frame]')]
  const bob = dancer.querySelector('.dancer-bob')
  if (!frames.length) return

  const speed = Number(dancer.dataset.speed || 9000)
  const delay = Number(dancer.dataset.delay || 0)
  const frameMs = 180
  let frameIndex = 0
  let facing = 1
  let start = null
  let lastFrameAt = 0
  let rafId = 0

  const setFrame = (index) => {
    frames.forEach((frame, i) => {
      frame.classList.toggle('is-active', i === index)
    })
  }

  setFrame(0)

  if (reduceMotion) {
    dancer.style.left = '50%'
    dancer.style.transform = 'translateX(-50%)'
    return
  }

  const tick = (now) => {
    if (start === null) start = now + delay
    if (now < start) {
      rafId = requestAnimationFrame(tick)
      return
    }

    const elapsed = now - start
    const cycle = (elapsed % speed) / speed

    // Move across, then reverse
    let x
    if (cycle < 0.5) {
      facing = 1
      x = cycle * 2
    } else {
      facing = -1
      x = 1 - (cycle - 0.5) * 2
    }

    // Step bounce synced to frame tempo
    const step = (elapsed / frameMs) % 4
    const bounce = Math.abs(Math.sin((elapsed / frameMs) * Math.PI * 0.5)) * 10
    const sway = Math.sin(elapsed / 220) * 3
    const stretch = 1 + Math.sin(elapsed / 180) * 0.015

    const parentWidth = dancer.parentElement?.clientWidth || window.innerWidth
    const dancerWidth = dancer.offsetWidth || 120
    const travel = Math.max(parentWidth - dancerWidth * 0.55, parentWidth * 0.7)
    const left = x * travel - dancerWidth * 0.15

    dancer.style.transform = `translate3d(${left}px, ${-bounce}px, 0) scaleX(${facing}) scaleY(${stretch})`
    if (bob) bob.style.transform = `rotate(${sway * facing}deg)`

    if (now - lastFrameAt >= frameMs) {
      frameIndex = (frameIndex + 1) % frames.length
      setFrame(frameIndex)
      lastFrameAt = now
    }

    rafId = requestAnimationFrame(tick)
  }

  rafId = requestAnimationFrame(tick)

  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId)
      } else {
        start = null
        lastFrameAt = 0
        rafId = requestAnimationFrame(tick)
      }
    },
    { passive: true },
  )
}

document.querySelectorAll('[data-dancer]').forEach(createWaltz)
