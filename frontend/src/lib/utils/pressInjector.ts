import type { PressMapEntry, PressRole, ProwlyPost } from '../../types'

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='300'%3E%3Crect width='600' height='300' fill='%23e5e7eb'/%3E%3Ctext x='300' y='158' text-anchor='middle' fill='%239ca3af' font-size='18' font-family='sans-serif'%3EBrak zdj%C4%99cia%3C/text%3E%3C/svg%3E"

function applyRole(el: Element, role: PressRole, post: ProwlyPost): void {
  const imgSrc = post.image || PLACEHOLDER

  switch (role) {
    case 'press_title': {
      el.textContent = post.title
      break
    }

    case 'press_hero_image':
    case 'press_secondary_image': {
      if (el.tagName === 'IMG') {
        ;(el as HTMLImageElement).src = imgSrc
        ;(el as HTMLImageElement).alt = post.title
      } else {
        ;(el as HTMLElement).style.backgroundImage = `url(${imgSrc})`
      }
      break
    }

    case 'press_cta_link':
    case 'press_source_link': {
      ;(el as HTMLAnchorElement).href = post.link
      if (!el.textContent?.trim()) el.textContent = post.link
      break
    }

    case 'press_cta_button':
    case 'press_secondary_cta': {
      const anchor = (el.tagName === 'A' ? el : el.closest('a') ?? el.querySelector('a')) as HTMLAnchorElement | null
      if (anchor) anchor.href = post.link
      break
    }

    case 'press_date': {
      if (post.pubDate) {
        try {
          el.textContent = new Date(post.pubDate).toLocaleDateString('pl-PL', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        } catch {
          el.textContent = post.pubDate
        }
      }
      break
    }

    default:
      break
  }
}

// Returns the deepest element that is an ancestor of (or equal to) all elements.
// Returns null if the common ancestor would be <body> or <html>.
function lowestCommonAncestor(els: Element[]): Element | null {
  if (els.length === 0) return null
  let node: Element = els[0]
  for (let i = 1; i < els.length; i++) {
    const el = els[i]
    while (node !== el && !node.contains(el)) {
      const parent = node.parentElement
      if (!parent || parent.tagName === 'BODY' || parent.tagName === 'HTML') return null
      node = parent
    }
  }
  if (node.tagName === 'BODY' || node.tagName === 'HTML') return null
  return node
}

function mergeStyle(el: HTMLElement, props: string): void {
  const existing = (el.getAttribute('style') ?? '').replace(/;\s*$/, '')
  el.setAttribute('style', existing ? `${existing}; ${props}` : props)
}

// Makes the two press-release boxes equal height and aligns CTA buttons to the bottom.
// Works by applying flex-column to each box (they equalize via the shared parent's stretch).
function equalizeBoxes(
  ip1Els: Element[],
  ip2Els: Element[],
  cta1: Element | null,
  cta2: Element | null,
): void {
  if (ip1Els.length === 0 || ip2Els.length === 0) return

  const box1 = lowestCommonAncestor(ip1Els)
  const box2 = lowestCommonAncestor(ip2Els)
  if (!box1 || !box2 || box1 === box2) return
  if (box1.parentElement !== box2.parentElement) return

  const parent = box1.parentElement!

  // Make each box a vertical flex column so CTA can be pushed to the bottom
  mergeStyle(box1 as HTMLElement, 'display:flex; flex-direction:column; height:100%')
  mergeStyle(box2 as HTMLElement, 'display:flex; flex-direction:column; height:100%')

  // Push CTA buttons to the bottom of their respective boxes
  if (cta1) mergeStyle(cta1 as HTMLElement, 'margin-top:auto')
  if (cta2) mergeStyle(cta2 as HTMLElement, 'margin-top:auto')

  // For non-table parents ensure children stretch to equal height
  const parentTag = parent.tagName
  if (parentTag !== 'TR' && parentTag !== 'TBODY' && parentTag !== 'TABLE') {
    mergeStyle(parent as HTMLElement, 'display:flex; align-items:stretch')
  }
}

/**
 * Injects Prowly press-release data into the rendered HTML using the
 * pressMappings CSS selectors. Returns the modified HTML string.
 *
 * Must be called AFTER renderTemplate() so all {{variables}} are gone
 * and the selectors can find the correct elements.
 */
export function injectPressData(
  html: string,
  mappings: PressMapEntry[] | undefined,
  posts: [ProwlyPost | null, ProwlyPost | null],
): string {
  if (!mappings || mappings.length === 0) return html
  if (!posts[0] && !posts[1]) return html

  const isFullDoc = /<html[\s>]/i.test(html)
  const doc = new DOMParser().parseFromString(
    isFullDoc ? html : `<!DOCTYPE html><html><body>${html}</body></html>`,
    'text/html',
  )

  const ip1Els: Element[] = []
  const ip2Els: Element[] = []
  let cta1: Element | null = null
  let cta2: Element | null = null

  for (const mapping of mappings) {
    const post = posts[mapping.instance - 1]
    if (!post) continue

    let el: Element | null
    try {
      el = doc.querySelector(mapping.selector)
    } catch {
      continue
    }
    if (!el) continue

    applyRole(el, mapping.role, post)

    if (mapping.instance === 1) {
      ip1Els.push(el)
      if (mapping.role === 'press_cta_button' || mapping.role === 'press_cta_link') cta1 = el
    } else {
      ip2Els.push(el)
      if (mapping.role === 'press_cta_button' || mapping.role === 'press_cta_link') cta2 = el
    }
  }

  // Equalize heights only when both press releases are selected
  if (posts[0] && posts[1]) {
    equalizeBoxes(ip1Els, ip2Els, cta1, cta2)
  }

  return isFullDoc ? doc.documentElement.outerHTML : doc.body.innerHTML
}
