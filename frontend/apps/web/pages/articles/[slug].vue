<script setup lang="ts">
import {
  buildArticleNeighbors,
  buildRelatedArticles,
  fetchPublicPostDetail,
  fetchPublicPosts,
} from '~/services/api'
import { renderArticleMarkdown } from '~/utils/markdown'

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const { data } = await useAsyncData(
  () => `article-${slug.value}`,
  async () => {
    const [article, posts] = await Promise.all([
      fetchPublicPostDetail(slug.value),
      fetchPublicPosts({ pageSize: 100 }),
    ])

    return {
      article,
      posts: posts.items,
    }
  },
  {
    watch: [slug],
  },
)

const article = computed(() => data.value?.article)
const neighbors = computed(() => buildArticleNeighbors(data.value?.posts ?? [], slug.value))
const relatedArticles = computed(() =>
  article.value ? buildRelatedArticles(data.value?.posts ?? [], article.value) : [],
)

const articleMarkdown = computed(() => {
  if (!article.value) {
    return ''
  }

  if (article.value.markdownContent?.trim()) {
    return article.value.markdownContent
  }

  return article.value.sections
    .flatMap((section) => {
      const paragraphs = section.paragraphs
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)

      return [
        `## ${section.title}`,
        ...paragraphs,
      ]
    })
    .join('\n\n')
})

const renderedArticle = computed(() => renderArticleMarkdown(articleMarkdown.value))
const articleHtml = computed(() => renderedArticle.value.html || '<p>暂无正文内容。</p>')
const tocItems = computed(() =>
  renderedArticle.value.toc.length > 0
    ? renderedArticle.value.toc
    : (article.value?.toc ?? []),
)
const tocSignature = computed(() => tocItems.value.map((item) => `${item.id}:${item.level}`).join('|'))
const articleContentRef = ref<HTMLElement | null>(null)
const activeHeadingId = ref('')
let scrollContainer: HTMLElement | Window | null = null
let syncFrameId: number | null = null

const syncReadingState = () => {
  if (!import.meta.client) {
    return
  }

  const contentEl = articleContentRef.value
  const toc = tocItems.value

  if (!contentEl || toc.length === 0) {
    activeHeadingId.value = ''
    return
  }

  const headings = toc.flatMap((item) => {
    const headingEl = document.getElementById(item.id)
    return headingEl && contentEl.contains(headingEl)
      ? [{
          id: item.id,
          element: headingEl,
        }]
      : []
  })

  if (headings.length === 0) {
    activeHeadingId.value = ''
    return
  }

  const scrollTop =
    scrollContainer instanceof HTMLElement
      ? scrollContainer.scrollTop
      : (window.scrollY || window.pageYOffset)
  const viewportHeight =
    scrollContainer instanceof HTMLElement
      ? scrollContainer.clientHeight
      : window.innerHeight
  const scrollHeight =
    scrollContainer instanceof HTMLElement
      ? scrollContainer.scrollHeight
      : Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight,
        )
  const containerTop =
    scrollContainer instanceof HTMLElement
      ? scrollContainer.getBoundingClientRect().top
      : 0

  if (scrollTop + viewportHeight >= scrollHeight - 4) {
    activeHeadingId.value = headings.at(-1)?.id ?? ''
    return
  }

  const anchorOffset = Math.min(Math.max(viewportHeight * 0.28, 140), 220)
  const anchorTop = scrollTop + anchorOffset
  let nextActiveId = headings[0]?.id ?? ''

  for (const heading of headings) {
    const headingTop = heading.element.getBoundingClientRect().top - containerTop + scrollTop
    if (anchorTop >= headingTop) {
      nextActiveId = heading.id
    } else {
      break
    }
  }

  activeHeadingId.value = nextActiveId
}

const requestSyncReadingState = () => {
  if (!import.meta.client || syncFrameId !== null) {
    return
  }

  syncFrameId = window.requestAnimationFrame(() => {
    syncFrameId = null
    syncReadingState()
  })
}

watch(
  () => [articleHtml.value, tocSignature.value],
  async () => {
    await nextTick()
    requestSyncReadingState()
  },
  { immediate: true },
)

onMounted(() => {
  if (!import.meta.client) {
    return
  }

  const mainScroll = document.querySelector('.web-main')
  scrollContainer = mainScroll instanceof HTMLElement ? mainScroll : window
  scrollContainer.addEventListener('scroll', requestSyncReadingState, { passive: true })
  window.addEventListener('resize', requestSyncReadingState)
  requestSyncReadingState()
})

onBeforeUnmount(() => {
  if (!import.meta.client) {
    return
  }

  scrollContainer?.removeEventListener('scroll', requestSyncReadingState)
  window.removeEventListener('resize', requestSyncReadingState)
  scrollContainer = null

  if (syncFrameId !== null) {
    window.cancelAnimationFrame(syncFrameId)
    syncFrameId = null
  }
})

if (!article.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Article not found',
  })
}

useSeoMeta({
  title: article.value.seoTitle,
  description: article.value.seoDescription,
})
</script>

<template>
  <div class="page">
    <div class="container page-stack">
      <section
        v-if="article"
        class="article-layout"
      >
        <article class="card article-detail">
          <span class="eyebrow">文章详情</span>
          <h1>{{ article.title }}</h1>
          <p class="article-detail__summary">{{ article.summary }}</p>
          <ArticleMeta
            :published-at="article.publishedAt"
            :updated-at="article.updatedAt"
            :reading-time="article.readingTime"
            :category="article.category"
            :tags="article.tags"
          />
          <section
            ref="articleContentRef"
            class="article-content"
            v-html="articleHtml"
          />

          <div class="article-neighbors">
            <NuxtLink
              v-if="neighbors.prev"
              :to="`/articles/${neighbors.prev.slug}`"
              class="card article-neighbor"
            >
              <span>上一篇</span>
              <strong>{{ neighbors.prev.title }}</strong>
            </NuxtLink>
            <NuxtLink
              v-if="neighbors.next"
              :to="`/articles/${neighbors.next.slug}`"
              class="card article-neighbor"
            >
              <span>下一篇</span>
              <strong>{{ neighbors.next.title }}</strong>
            </NuxtLink>
          </div>
        </article>

        <aside class="card article-toc">
          <h2>目录</h2>
          <nav>
            <a
              v-for="section in tocItems"
              :key="section.id"
              :href="`#${section.id}`"
              :class="[
                'toc-link',
                `toc-link--level-${section.level}`,
                { 'toc-link--active': section.id === activeHeadingId },
              ]"
              :aria-current="section.id === activeHeadingId ? 'location' : undefined"
            >
              {{ section.title }}
            </a>
            <p
              v-if="tocItems.length === 0"
              class="article-toc__empty"
            >
              当前正文暂未生成目录。
            </p>
          </nav>

          <div class="article-toc__related">
            <h3>相关推荐</h3>
            <NuxtLink
              v-for="item in relatedArticles"
              :key="item.id"
              :to="`/articles/${item.slug}`"
              class="text-link"
            >
              {{ item.title }}
            </NuxtLink>
          </div>
        </aside>
      </section>
    </div>
  </div>
</template>
