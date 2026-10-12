import {
  FAMILIES,
  SHIPPING_FLAT,
  SHIPPING_THRESHOLD,
  bundles,
  findItem,
  products,
} from "./catalog.js"

const CART_KEY = "bloom-balm-cart"
const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
})

const shopGrid = document.querySelector("#shop-grid")
const bundleGrid = document.querySelector("#bundle-grid")
const filterRow = document.querySelector("#filters")
const cartButton = document.querySelector("#open-cart")
const cartCount = document.querySelector("#cart-count")
const cartDialog = document.querySelector("#cart-dialog")
const cartBody = document.querySelector("#cart-body")
const productDialog = document.querySelector("#product-dialog")
const productBody = document.querySelector("#product-body")
const toast = document.querySelector("#toast")
const menuButton = document.querySelector("#menu-button")
const nav = document.querySelector("#site-nav")
const header = document.querySelector(".site-header")
const flavorRail = document.querySelector("#flavor-rail")

let cart = loadCart()
let filter = "All"
let toastTimer = 0

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (line) => line && findItem(line.id) && Number.isInteger(line.qty) && line.qty > 0,
    )
  } catch {
    return []
  }
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart))
  renderCartCount()
}

function cartQty() {
  return cart.reduce((sum, line) => sum + line.qty, 0)
}

function lineItems() {
  return cart
    .map((line) => {
      const item = findItem(line.id)
      return item ? { ...line, item } : null
    })
    .filter(Boolean)
}

function subtotal() {
  return lineItems().reduce((sum, line) => sum + line.item.price * line.qty, 0)
}

function shippingFor(amount) {
  if (amount <= 0) return 0
  return amount >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT
}

function formatMoney(amount) {
  return money.format(amount)
}

function h(tag, attrs = {}, children = []) {
  const node = document.createElement(tag)
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue
    if (key === "class") node.className = value
    else if (key === "text") node.textContent = value
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value)
    } else if (value === true) node.setAttribute(key, "")
    else node.setAttribute(key, String(value))
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue
    node.append(child instanceof Node ? child : document.createTextNode(String(child)))
  }
  return node
}

function tin(item, size = "md") {
  const included = item.includes?.map(findItem).filter(Boolean) ?? []
  const root = h("span", {
    class: `tin tin-${size}`,
    style: `--balm:${item.balm || included[0]?.balm || "#e7a0ab"};--deep:${item.deep || included[0]?.deep || "#8d3546"}`,
    "aria-hidden": "true",
  })

  if (included.length > 1) {
    root.classList.add("tin-cluster")
    included.slice(0, 3).forEach((part, index) => {
      root.append(
        h("span", {
          class: "tin-mini",
          style: `--balm:${part.balm};--deep:${part.deep};--i:${index}`,
        }, [
          h("span", { class: "tin-cap" }),
          h("span", { class: "tin-body" }, [h("span", { class: "tin-mark", text: "B" })]),
        ]),
      )
    })
    return root
  }

  root.append(
    h("span", { class: "tin-cap" }),
    h("span", { class: "tin-body" }, [
      h("span", { class: "tin-mark", text: "B" }),
      h("span", { class: "tin-name", text: item.name }),
    ]),
  )
  return root
}

function renderFilters() {
  filterRow.replaceChildren(
    ...FAMILIES.map((family) =>
      h("button", {
        type: "button",
        class: `chip${family === filter ? " is-active" : ""}`,
        "aria-pressed": family === filter ? "true" : "false",
        onclick: () => {
          filter = family
          renderFilters()
          renderShop()
        },
      }, [family]),
    ),
  )
}

function productCard(item) {
  return h("article", { class: "card" }, [
    h("button", {
      type: "button",
      class: "card-visual",
      onclick: () => openProduct(item.id),
    }, [
      item.badge ? h("span", { class: "badge", text: item.badge }) : null,
      tin(item),
      h("span", { class: "card-open", text: "View tin" }),
    ]),
    h("div", { class: "card-body" }, [
      h("p", { class: "family", text: item.family }),
      h("h3", {}, [
        h("button", {
          type: "button",
          class: "name-button",
          onclick: () => openProduct(item.id),
          text: item.name,
        }),
      ]),
      h("p", { class: "notes", text: item.notes }),
      h("div", { class: "card-row" }, [
        h("p", { class: "price" }, [
          h("span", { text: formatMoney(item.price) }),
          item.compareAt
            ? h("s", { text: formatMoney(item.compareAt) })
            : h("span", { class: "size", text: "0.15 oz" }),
        ]),
        h("button", {
          type: "button",
          class: "btn btn-small",
          onclick: () => addToCart(item.id, 1),
          text: "Add",
        }),
      ]),
    ]),
  ])
}

function renderShop() {
  const visible =
    filter === "All" ? products : products.filter((item) => item.family === filter)
  shopGrid.replaceChildren(...visible.map(productCard))
}

function renderBundles() {
  bundleGrid.replaceChildren(...bundles.map(productCard))
}

function renderCartCount() {
  const qty = cartQty()
  cartCount.textContent = String(qty)
  cartCount.hidden = qty === 0
  cartButton.setAttribute("aria-label", qty ? `Open cart, ${qty} items` : "Open cart")
}

function addToCart(id, qty) {
  const item = findItem(id)
  if (!item) return
  const nextQty = Math.min(8, qty)
  const existing = cart.find((line) => line.id === id)
  if (existing) existing.qty = Math.min(8, existing.qty + nextQty)
  else cart.push({ id, qty: nextQty })
  saveCart()
  showToast(`${item.name} added to cart`)
  if (cartDialog.open) renderCart()
}

function setQty(id, qty) {
  if (qty <= 0) cart = cart.filter((line) => line.id !== id)
  else {
    const line = cart.find((entry) => entry.id === id)
    if (line) line.qty = Math.min(8, qty)
  }
  saveCart()
  renderCart()
}

function showToast(message) {
  toast.textContent = message
  toast.hidden = false
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.hidden = true
  }, 2200)
}

function openProduct(id) {
  const item = findItem(id)
  if (!item) return
  let qty = 1

  const qtyLabel = h("span", { class: "qty-value", text: "1" })
  const included = item.includes?.map(findItem).filter(Boolean) ?? []

  const panel = h("div", { class: "product-panel" }, [
    h("div", { class: "product-stage" }, [tin(item, "lg")]),
    h("div", { class: "product-copy" }, [
      h("p", { class: "family", text: item.family }),
      h("h2", { id: "product-title", text: item.name }),
      h("p", { class: "product-price" }, [
        h("span", { text: formatMoney(item.price) }),
        item.compareAt ? h("s", { text: formatMoney(item.compareAt) }) : null,
      ]),
      h("p", { class: "notes", text: item.notes }),
      h("p", { text: item.description }),
      included.length
        ? h("ul", { class: "include-list" }, included.map((part) => h("li", { text: part.name })))
        : null,
      h("p", { class: "ingredients" }, [
        h("strong", { text: "Inside the tin. " }),
        item.ingredients,
      ]),
      h("div", { class: "product-actions" }, [
        h("div", { class: "stepper", "aria-label": "Quantity" }, [
          h("button", {
            type: "button",
            onclick: () => {
              qty = Math.max(1, qty - 1)
              qtyLabel.textContent = String(qty)
            },
            "aria-label": "Decrease quantity",
            text: "–",
          }),
          qtyLabel,
          h("button", {
            type: "button",
            onclick: () => {
              qty = Math.min(8, qty + 1)
              qtyLabel.textContent = String(qty)
            },
            "aria-label": "Increase quantity",
            text: "+",
          }),
        ]),
        h("button", {
          type: "button",
          class: "btn btn-primary",
          onclick: () => {
            addToCart(item.id, qty)
            productDialog.close()
          },
          text: "Add to cart",
        }),
      ]),
    ]),
  ])

  productBody.replaceChildren(panel)
  if (!productDialog.open) productDialog.showModal()
}

function renderCart(view = "cart", notice = "") {
  const lines = lineItems()
  const goods = subtotal()
  const shipping = shippingFor(goods)
  const total = goods + shipping

  if (view === "done") {
    cartBody.replaceChildren(notice)
    return
  }

  if (view === "checkout") {
    cartBody.replaceChildren(checkoutForm(lines, goods, shipping, total))
    return
  }

  const summary = h("div", { class: "cart-summary" }, [
    h("div", { class: "sum-row" }, [h("span", { text: "Subtotal" }), h("span", { text: formatMoney(goods) })]),
    h("div", { class: "sum-row" }, [
      h("span", { text: "Shipping" }),
      h("span", { text: shipping === 0 ? "Free" : formatMoney(shipping) }),
    ]),
    h("div", { class: "sum-row sum-total" }, [h("span", { text: "Total" }), h("span", { text: formatMoney(total) })]),
    h("p", { class: "ship-note", text: shippingNote(goods) }),
    h("button", {
      type: "button",
      class: "btn btn-primary btn-block",
      onclick: () => renderCart("checkout"),
      text: "Checkout",
    }),
  ])

  if (!lines.length) {
    cartBody.replaceChildren(
      h("div", { class: "empty-cart" }, [
        h("p", { text: "Your cart is waiting for a tin." }),
        h("button", {
          type: "button",
          class: "btn btn-primary",
          onclick: () => {
            cartDialog.close()
            document.querySelector("#shop")?.scrollIntoView({ behavior: "smooth" })
          },
          text: "Shop the collection",
        }),
      ]),
    )
    return
  }

  cartBody.replaceChildren(
    h("ul", { class: "cart-lines" }, lines.map(cartLine)),
    summary,
  )
}

function cartLine(line) {
  return h("li", { class: "cart-line" }, [
    tin(line.item, "sm"),
    h("div", { class: "line-copy" }, [
      h("p", { class: "line-name", text: line.item.name }),
      h("p", { class: "line-meta", text: formatMoney(line.item.price) }),
      h("div", { class: "stepper" }, [
        h("button", {
          type: "button",
          "aria-label": `Decrease ${line.item.name}`,
          onclick: () => setQty(line.id, line.qty - 1),
          text: "–",
        }),
        h("span", { class: "qty-value", text: String(line.qty) }),
        h("button", {
          type: "button",
          "aria-label": `Increase ${line.item.name}`,
          onclick: () => setQty(line.id, line.qty + 1),
          text: "+",
        }),
      ]),
    ]),
    h("button", {
      type: "button",
      class: "text-button",
      onclick: () => setQty(line.id, 0),
      text: "Remove",
    }),
  ])
}

function shippingNote(goods) {
  if (goods <= 0) return ""
  if (goods >= SHIPPING_THRESHOLD) return "Complimentary shipping is included."
  const remaining = SHIPPING_THRESHOLD - goods
  return `Add ${formatMoney(remaining)} for complimentary shipping.`
}

function checkoutForm(lines, goods, shipping, total) {
  const error = h("p", { class: "form-error", role: "alert" })
  error.hidden = true

  const fields = [
    ["name", "Full name", "text", "name", "Ada Bloom"],
    ["email", "Email", "email", "email", "ada@example.com"],
    ["address", "Street address", "text", "street-address", "18 Petal Lane"],
    ["city", "City", "text", "address-level2", "Savannah"],
    ["region", "State", "text", "address-level1", "GA"],
    ["postal", "ZIP", "text", "postal-code", "31401"],
  ]

  const form = h("form", { class: "checkout", novalidate: true }, [
    h("p", {
      class: "checkout-lead",
      text: "We’ll email an invoice for this order. Nothing is charged in the browser.",
    }),
    ...fields.map(([name, label, type, autocomplete, placeholder]) =>
      h("label", { class: "field" }, [
        h("span", { text: label }),
        h("input", { name, type, required: true, autocomplete, placeholder }),
      ]),
    ),
    h("label", { class: "field" }, [
      h("span", { text: "Note for the atelier" }),
      h("textarea", { name: "note", rows: "2", placeholder: "Gift wrap, a door code, anything we should know" }),
    ]),
    error,
    h("div", { class: "cart-summary" }, [
      ...lines.map((line) =>
        h("div", { class: "sum-row" }, [
          h("span", { text: `${line.item.name} × ${line.qty}` }),
          h("span", { text: formatMoney(line.item.price * line.qty) }),
        ]),
      ),
      h("div", { class: "sum-row" }, [
        h("span", { text: "Shipping" }),
        h("span", { text: shipping === 0 ? "Free" : formatMoney(shipping) }),
      ]),
      h("div", { class: "sum-row sum-total" }, [
        h("span", { text: "Due by invoice" }),
        h("span", { text: formatMoney(total) }),
      ]),
    ]),
    h("button", { type: "submit", class: "btn btn-primary btn-block", text: "Place order" }),
    h("button", {
      type: "button",
      class: "btn btn-ghost btn-block",
      onclick: () => renderCart("cart"),
      text: "Back to cart",
    }),
  ])

  form.addEventListener("submit", (event) => {
    event.preventDefault()
    const data = new FormData(form)
    const name = String(data.get("name") || "").trim()
    const email = String(data.get("email") || "").trim()
    const address = String(data.get("address") || "").trim()
    const city = String(data.get("city") || "").trim()
    const region = String(data.get("region") || "").trim()
    const postal = String(data.get("postal") || "").trim()
    const note = String(data.get("note") || "").trim()

    if (!name || !email || !address || !city || !region || !postal || !email.includes("@")) {
      error.hidden = false
      error.textContent = "Add a name, a real email, and a full shipping address."
      return
    }

    const orderNumber = `BB-${Math.floor(1000 + Math.random() * 9000)}`
    const snapshot = lineItems()
    cart = []
    saveCart()
    renderCart(
      "done",
      h("div", { class: "order-done" }, [
        h("p", { class: "family", text: "Order received" }),
        h("h3", { text: "Your tins are spoken for." }),
        h("p", { class: "order-number", text: orderNumber }),
        h("p", { text: `An invoice is staged for ${email}. Ship to ${name}, ${address}, ${city}, ${region} ${postal}.` }),
        note ? h("p", { class: "notes", text: `Note: ${note}` }) : null,
        h("ul", { class: "include-list" }, snapshot.map((line) => h("li", { text: `${line.item.name} × ${line.qty}` }))),
        h("p", { class: "sum-total", text: formatMoney(total) }),
        h("button", {
          type: "button",
          class: "btn btn-primary",
          onclick: () => cartDialog.close(),
          text: "Keep browsing",
        }),
      ]),
    )
  })

  return form
}

function openCart() {
  renderCart("cart")
  if (!cartDialog.open) cartDialog.showModal()
}

cartButton.addEventListener("click", openCart)

document.querySelectorAll("[data-open-cart]").forEach((button) => {
  button.addEventListener("click", openCart)
})

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => {
    button.closest("dialog")?.close()
  })
})

menuButton.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open")
  menuButton.setAttribute("aria-expanded", open ? "true" : "false")
})

nav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("is-open")
    menuButton.setAttribute("aria-expanded", "false")
  })
})

const onScroll = () => {
  header.classList.toggle("is-scrolled", window.scrollY > 12)
}
onScroll()
window.addEventListener("scroll", onScroll, { passive: true })

const reveals = document.querySelectorAll(".reveal")
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible")
          observer.unobserve(entry.target)
        }
      }
    },
    { threshold: 0.16 },
  )
  reveals.forEach((el) => observer.observe(el))
} else {
  reveals.forEach((el) => el.classList.add("is-visible"))
}

function renderFlavorRail() {
  if (!flavorRail) return
  const set = (hidden) =>
    h("div", { class: "flavor-set", "aria-hidden": hidden ? "true" : null }, products.map((product) =>
      h("button", {
        type: "button",
        class: "flavor-chip",
        style: `--balm:${product.balm};--deep:${product.deep}`,
        onclick: () => openProduct(product.id),
      }, [
        h("span", { class: "flavor-swatch", "aria-hidden": "true" }),
        product.name,
      ]),
    ))

  flavorRail.replaceChildren(h("div", { class: "flavor-track" }, [set(false), set(true)]))
}

renderFlavorRail()
renderFilters()
renderShop()
renderBundles()
renderCartCount()
