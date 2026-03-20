import type { ArticleTocItem } from '@blog/shared-types'

interface MarkdownRenderResult {
  html: string
  toc: ArticleTocItem[]
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const sanitizeHref = (href: string) => {
  const normalized = href.trim()
  return /^https?:\/\//i.test(normalized) ? normalized : '#'
}

const sanitizeSrc = (src: string) => {
  const normalized = src.trim()
  return /^https?:\/\//i.test(normalized) ? normalized : ''
}

const slugifyHeading = (value: string, fallbackIndex: number) => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return normalized || `section-${fallbackIndex}`
}

const parseInline = (value: string) => {
  const inlineCodeStore: string[] = []
  const imageStore: string[] = []

  let transformed = value.replace(/`([^`]+)`/g, (_, code: string) => {
    const token = `@@INLINE_CODE_${inlineCodeStore.length}@@`
    inlineCodeStore.push(`<code>${code}</code>`)
    return token
  })

  transformed = transformed.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (_, alt: string, src: string) => {
      const token = `@@INLINE_IMAGE_${imageStore.length}@@`
      const safeSrc = sanitizeSrc(src)

      imageStore.push(
        safeSrc
          ? `<img class="article-content__image" src="${escapeHtml(safeSrc)}" alt="${escapeHtml(alt)}" loading="lazy" />`
          : `<span>[图片链接无效]</span>`,
      )
      return token
    },
  )

  transformed = transformed.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, label: string, href: string) =>
      `<a href="${escapeHtml(sanitizeHref(href))}" target="_blank" rel="noopener noreferrer">${label}</a>`,
  )
  transformed = transformed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  transformed = transformed.replace(/\*([^*]+)\*/g, '<em>$1</em>')

  return transformed
    .replace(/@@INLINE_IMAGE_(\d+)@@/g, (_, index: string) => imageStore[Number(index)] ?? '')
    .replace(/@@INLINE_CODE_(\d+)@@/g, (_, index: string) => inlineCodeStore[Number(index)] ?? '')
}

export const renderArticleMarkdown = (value: string): MarkdownRenderResult => {
  const source = value.replace(/\r\n?/g, '\n').trim()

  if (!source) {
    return {
      html: '',
      toc: [],
    }
  }

  const codeBlocks: string[] = []
  const withCodeTokens = source.replace(/```([\w-]+)?\n([\s\S]*?)```/g, (_, language: string, code: string) => {
    const token = `@@CODE_BLOCK_${codeBlocks.length}@@`
    const codeLanguage = language ? ` language-${escapeHtml(language)}` : ''

    codeBlocks.push(
      `<pre class="article-content__code"><code class="${codeLanguage}">${escapeHtml(code.trimEnd())}</code></pre>`,
    )
    return token
  })

  const lines = withCodeTokens.split('\n')
  const htmlParts: string[] = []
  const tocDraft: ArticleTocItem[] = []
  const headingIdCounts = new Map<string, number>()
  let listType: 'ul' | 'ol' | null = null
  let isInQuote = false
  let headingIndex = 0

  const closeList = () => {
    if (listType) {
      htmlParts.push(`</${listType}>`)
      listType = null
    }
  }

  const closeQuote = () => {
    if (isInQuote) {
      htmlParts.push('</blockquote>')
      isInQuote = false
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      closeList()
      closeQuote()
      continue
    }

    if (/^@@CODE_BLOCK_\d+@@$/.test(trimmed)) {
      closeList()
      closeQuote()
      htmlParts.push(trimmed)
      continue
    }

    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(trimmed)
    if (headingMatch) {
      closeList()
      closeQuote()
      headingIndex += 1
      const level = headingMatch[1].length
      const title = headingMatch[2].trim()
      const baseId = slugifyHeading(title, headingIndex)
      const usedCount = headingIdCounts.get(baseId) ?? 0
      const id = usedCount === 0 ? baseId : `${baseId}-${usedCount + 1}`
      headingIdCounts.set(baseId, usedCount + 1)
      htmlParts.push(`<h${level} id="${id}">${parseInline(escapeHtml(title))}</h${level}>`)

      if (level >= 2) {
        tocDraft.push({
          id,
          title,
          level,
        })
      }
      continue
    }

    if (/^---+$/.test(trimmed)) {
      closeList()
      closeQuote()
      htmlParts.push('<hr />')
      continue
    }

    const quoteMatch = /^>\s?(.+)$/.exec(trimmed)
    if (quoteMatch) {
      closeList()
      if (!isInQuote) {
        htmlParts.push('<blockquote>')
        isInQuote = true
      }

      htmlParts.push(`<p>${parseInline(escapeHtml(quoteMatch[1]))}</p>`)
      continue
    }

    closeQuote()

    const unorderedMatch = /^[-*+]\s+(.+)$/.exec(trimmed)
    if (unorderedMatch) {
      if (listType !== 'ul') {
        closeList()
        htmlParts.push('<ul>')
        listType = 'ul'
      }
      htmlParts.push(`<li>${parseInline(escapeHtml(unorderedMatch[1]))}</li>`)
      continue
    }

    const orderedMatch = /^\d+\.\s+(.+)$/.exec(trimmed)
    if (orderedMatch) {
      if (listType !== 'ol') {
        closeList()
        htmlParts.push('<ol>')
        listType = 'ol'
      }
      htmlParts.push(`<li>${parseInline(escapeHtml(orderedMatch[1]))}</li>`)
      continue
    }

    closeList()
    htmlParts.push(`<p>${parseInline(escapeHtml(trimmed))}</p>`)
  }

  closeList()
  closeQuote()

  const tocBaseLevel = tocDraft.reduce(
    (minLevel, item) => Math.min(minLevel, item.level),
    Number.POSITIVE_INFINITY,
  )
  const toc =
    tocBaseLevel === Number.POSITIVE_INFINITY
      ? []
      : tocDraft.map((item) => ({
          ...item,
          level: Math.min(6, item.level - tocBaseLevel + 2),
        }))

  return {
    html: htmlParts
      .join('\n')
      .replace(/@@CODE_BLOCK_(\d+)@@/g, (_, index: string) => codeBlocks[Number(index)] ?? ''),
    toc,
  }
}
