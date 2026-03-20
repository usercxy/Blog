<script setup lang="ts">
import { formatDateLabel } from '@blog/shared-utils'
import { fetchHomePageData, fetchPublicPosts, summarizeReadingStats } from '~/services/api'
import { useSiteStore } from '~/stores/site'

const [{ data: homeData }, { data: allPostsData }] = await Promise.all([
  useAsyncData('home-page', fetchHomePageData),
  useAsyncData('home-page-posts', () => fetchPublicPosts({ pageSize: 100 })),
])

const siteStore = useSiteStore()
const featured = computed(() => homeData.value?.featuredPosts ?? [])
const categories = computed(() => homeData.value?.categories ?? [])
const featuredProjects = computed(() =>
  (homeData.value?.projects ?? []).filter((project) => project.featured),
)
const featuredPrimary = computed(() => featured.value[0])
const featuredSecondary = computed(() => featured.value.slice(1, 5))
const categoryQuickList = computed(() => categories.value.slice(0, 8))
const highlightedProject = computed(() => featuredProjects.value[0])
const readingStats = computed(() => summarizeReadingStats(allPostsData.value?.items ?? []))
const allPosts = computed(() => allPostsData.value?.items ?? [])

const tagQuickList = computed(() => {
  const counter = new Map<string, { id: string; slug: string; name: string; count: number }>()

  for (const article of allPosts.value) {
    for (const tag of article.tags) {
      const current = counter.get(tag.id)
      if (current) {
        current.count += 1
      } else {
        counter.set(tag.id, {
          id: tag.id,
          slug: tag.slug,
          name: tag.name,
          count: 1,
        })
      }
    }
  }

  return [...counter.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'))
    .slice(0, 14)
})

const today = new Date()
const calendarYear = today.getFullYear()
const calendarMonth = today.getMonth()
const calendarTitle = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
}).format(today)
const calendarWeekdays = ['一', '二', '三', '四', '五', '六', '日']

const calendarPublishedDays = computed(() => {
  const days = new Set<number>()

  for (const article of allPosts.value) {
    const publishedAt = new Date(article.publishedAt)
    if (
      publishedAt.getFullYear() === calendarYear
      && publishedAt.getMonth() === calendarMonth
    ) {
      days.add(publishedAt.getDate())
    }
  }

  return days
})

const calendarCells = computed(() => {
  const firstDay = new Date(calendarYear, calendarMonth, 1)
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()
  const startOffset = (firstDay.getDay() + 6) % 7
  const cells: Array<{
    key: string
    label: string
    isMuted: boolean
    isToday: boolean
    isPublished: boolean
  }> = []

  for (let index = 0; index < startOffset; index += 1) {
    cells.push({
      key: `empty-${index}`,
      label: '',
      isMuted: true,
      isToday: false,
      isPublished: false,
    })
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      key: `day-${day}`,
      label: String(day),
      isMuted: false,
      isToday: day === today.getDate(),
      isPublished: calendarPublishedDays.value.has(day),
    })
  }

  return cells
})

useSeoMeta({
  title: '首页',
  description: '展示博客定位、精选文章、最新内容和项目入口。',
})
</script>

<template>
  <div class="page home-page">
    <div class="home-shell">
      <aside class="home-column home-column--left">
        <section class="card home-site-panel">
          <span class="home-site-panel__eyebrow">{{ siteStore.siteSubtitle }}</span>
          <h1>{{ siteStore.siteName }}</h1>
          <p class="home-site-panel__title">{{ siteStore.heroTitle }}</p>
          <p class="home-site-panel__desc">{{ siteStore.heroDescription }}</p>

          <div class="home-site-panel__stats">
            <article>
              <span>文章</span>
              <strong>{{ readingStats.total }}</strong>
            </article>
            <article>
              <span>阅读分钟</span>
              <strong>{{ readingStats.minutes }}</strong>
            </article>
            <article>
              <span>项目</span>
              <strong>{{ featuredProjects.length }}</strong>
            </article>
          </div>
        </section>

        <section class="card home-calendar-panel">
          <header class="home-panel-head">
            <h2>{{ calendarTitle }}</h2>
          </header>
          <div class="home-calendar">
            <span
              v-for="weekday in calendarWeekdays"
              :key="weekday"
              class="home-calendar__weekday"
            >
              {{ weekday }}
            </span>
            <span
              v-for="day in calendarCells"
              :key="day.key"
              :class="[
                'home-calendar__day',
                {
                  'is-muted': day.isMuted,
                  'is-today': day.isToday,
                  'is-published': day.isPublished,
                },
              ]"
            >
              {{ day.label }}
            </span>
          </div>
        </section>
      </aside>

      <main class="home-column home-column--center">
        <section class="card home-featured-panel">
          <header class="home-panel-head">
            <h2>精选文章</h2>
            <NuxtLink class="text-link" to="/articles">
              全部文章
            </NuxtLink>
          </header>

          <NuxtLink
            v-if="featuredPrimary"
            :to="`/articles/${featuredPrimary.slug}`"
            class="home-featured-lead"
          >
            <img
              :src="featuredPrimary.cover"
              :alt="featuredPrimary.title"
              class="home-featured-lead__cover"
            >
            <div class="home-featured-lead__body">
              <span class="home-featured-lead__meta">
                {{ formatDateLabel(featuredPrimary.publishedAt) }} · {{ featuredPrimary.readingTime }} min
              </span>
              <h3>{{ featuredPrimary.title }}</h3>
              <p>{{ featuredPrimary.summary }}</p>
            </div>
          </NuxtLink>

          <div class="home-featured-list">
            <NuxtLink
              v-for="article in featuredSecondary"
              :key="article.id"
              :to="`/articles/${article.slug}`"
              class="home-featured-item"
            >
              <img
                :src="article.cover"
                :alt="article.title"
                class="home-featured-item__cover"
              >
              <div class="home-featured-item__body">
                <h3>{{ article.title }}</h3>
                <p>{{ article.summary }}</p>
                <small>{{ formatDateLabel(article.publishedAt) }}</small>
              </div>
            </NuxtLink>
          </div>
        </section>
      </main>

      <aside class="home-column home-column--right">
        <section class="card home-side-panel">
          <header class="home-panel-head">
            <h2>分类</h2>
          </header>
          <div class="home-category-list">
            <NuxtLink
              v-for="category in categoryQuickList"
              :key="category.id"
              :to="`/category/${category.slug}`"
              class="home-category-list__item"
            >
              <strong>{{ category.name }}</strong>
              <span>{{ category.description || '查看该分类内容' }}</span>
            </NuxtLink>
          </div>
        </section>

        <section class="card home-side-panel">
          <header class="home-panel-head">
            <h2>标签</h2>
          </header>
          <div class="home-tag-cloud">
            <NuxtLink
              v-for="tag in tagQuickList"
              :key="tag.id"
              :to="`/tag/${tag.slug}`"
              class="home-tag-cloud__item"
            >
              # {{ tag.name }}
            </NuxtLink>
          </div>
        </section>

        <section
          v-if="highlightedProject"
          class="card home-side-panel"
        >
          <header class="home-panel-head">
            <h2>项目</h2>
          </header>
          <NuxtLink
            class="home-project-link"
            :to="`/projects/${highlightedProject.slug}`"
          >
            {{ highlightedProject.name }}
          </NuxtLink>
          <p class="home-project-summary">{{ highlightedProject.summary }}</p>
          <NuxtLink class="text-link" to="/projects">
            查看全部项目
          </NuxtLink>
        </section>
      </aside>
    </div>
  </div>
</template>
