<script setup lang="ts">
import { formatDateLabel } from '@blog/shared-utils'
import { fetchSearchResults } from '~/services/api'

const route = useRoute()
const keyword = computed(() => String(route.query.q ?? '').trim())

const { data } = await useAsyncData(
  () => `search-${keyword.value}`,
  async () => {
    if (!keyword.value.trim()) {
      return []
    }

    const results = await fetchSearchResults(keyword.value)
    return results.items
  },
  {
    watch: [keyword],
  },
)

const results = computed(() => data.value ?? [])
const normalizedKeyword = computed(() => keyword.value.toLocaleLowerCase('zh-CN'))
const resultSummary = computed(() => {
  if (!keyword.value) {
    return '从导航栏左侧的搜索入口发起检索，结果会集中展示在这里。'
  }

  if (results.value.length === 0) {
    return `没有找到与“${keyword.value}”相关的内容。`
  }

  return `共找到 ${results.value.length} 条与“${keyword.value}”相关的内容。`
})

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const buildHighlightedHtml = (value: string) => {
  const text = value.trim()

  if (!text) {
    return ''
  }

  const escapedText = escapeHtml(text)
  if (!normalizedKeyword.value) {
    return escapedText
  }

  const matcher = new RegExp(`(${escapeRegExp(normalizedKeyword.value)})`, 'ig')
  return escapedText.replace(matcher, '<mark>$1</mark>')
}

const getSnippetText = (summary: string, snippet: string) => {
  const snippetText = snippet.trim()
  if (!snippetText) {
    return ''
  }

  const summaryText = summary.trim()
  return snippetText === summaryText ? '' : snippetText
}

useSeoMeta({
  title: '搜索',
  description: '搜索文章标题、摘要和正文内容。',
})
</script>

<template>
  <div class="page">
    <div class="container page-stack">
      <section class="card search-hero">
        <span class="eyebrow">站内搜索</span>
        <h1>搜索结果</h1>
        <p class="search-hero__summary">
          {{ resultSummary }}
        </p>
        <div
          v-if="keyword"
          class="search-hero__meta"
        >
          <span class="meta-chip">关键词：{{ keyword }}</span>
          <span class="meta-chip meta-chip--ghost">结果数：{{ results.length }}</span>
        </div>
      </section>

      <div
        v-if="results.length"
        class="search-results"
      >
        <article
          v-for="result in results"
          :key="result.id"
          class="card search-result-card"
        >
          <NuxtLink
            :to="`/articles/${result.slug}`"
            class="search-result-card__title"
          >
            <h2 v-html="buildHighlightedHtml(result.title)" />
          </NuxtLink>
          <p
            v-if="result.summary"
            class="search-result-card__summary"
            v-html="buildHighlightedHtml(result.summary)"
          />
          <p
            v-if="getSnippetText(result.summary, result.snippet)"
            class="search-result-card__snippet"
            v-html="buildHighlightedHtml(getSnippetText(result.summary, result.snippet))"
          />
          <p
            v-if="!result.summary && !getSnippetText(result.summary, result.snippet)"
            class="search-result-card__snippet"
          >
            暂无可展示摘要，点击查看正文。
          </p>
          <div class="article-meta">
            <span v-if="result.publishedAt">{{ formatDateLabel(result.publishedAt) }}</span>
            <NuxtLink
              v-for="category in result.categories"
              :key="category.id"
              :to="`/category/${category.slug}`"
              class="meta-chip"
            >
              {{ category.name }}
            </NuxtLink>
            <NuxtLink
              v-for="tag in result.tags"
              :key="tag.id"
              :to="`/tag/${tag.slug}`"
              class="meta-chip meta-chip--ghost"
            >
              #{{ tag.name }}
            </NuxtLink>
          </div>
        </article>
      </div>

      <EmptyState
        v-else
        :title="keyword ? '还没有搜索结果' : '等待搜索关键词'"
        description="你可以试试 Nuxt、后台、SEO、分类 等关键词。"
      />
    </div>
  </div>
</template>
