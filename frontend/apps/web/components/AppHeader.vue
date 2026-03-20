<script setup lang="ts">
import { Search } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useSiteStore } from '~/stores/site'
import logoUrl from '~/images/logo.png'

const siteStore = useSiteStore()
const links = computed(() => siteStore.navigation.filter((link) => link.to !== '/search'))
const route = useRoute()
const router = useRouter()
const searchInputRef = ref<HTMLInputElement | null>(null)
const isSearchExpanded = ref(false)
const searchKeyword = ref('')

watch(
  () => route.query.q,
  (value) => {
    searchKeyword.value = typeof value === 'string' ? value : ''
  },
  { immediate: true },
)

watch(
  () => route.path,
  (path) => {
    if (path !== '/search') {
      isSearchExpanded.value = false
    }
  },
  { immediate: true },
)

const focusSearchInput = async () => {
  isSearchExpanded.value = true
  await nextTick()
  searchInputRef.value?.focus()
  searchInputRef.value?.select()
}

const toggleSearch = async () => {
  if (isSearchExpanded.value && !searchKeyword.value.trim()) {
    isSearchExpanded.value = false
    return
  }

  await focusSearchInput()
}

const submitSearch = async () => {
  const keyword = searchKeyword.value.trim()

  if (!keyword) {
    isSearchExpanded.value = false

    if (route.path === '/search' && 'q' in route.query) {
      await router.replace('/search')
    }

    return
  }

  await router.push({
    path: '/search',
    query: { q: keyword },
  })
}

const handleSearchBlur = async () => {
  await submitSearch()
}
</script>

<template>
  <header class="app-header">
    <div class="app-header__container app-header__inner">
      <NuxtLink
        class="brand"
        to="/"
        :aria-label="siteStore.siteName"
      >
        <span class="brand__mark">
          <img
            :src="logoUrl"
            :alt="siteStore.siteName"
            class="brand__logo"
          >
        </span>
        <span class="brand__text">
          <strong>{{ siteStore.siteName }}</strong>
          <small>{{ siteStore.siteSubtitle }}</small>
        </span>
      </NuxtLink>
      <nav class="nav">
        <div
          class="nav-search"
          :class="{ 'is-expanded': isSearchExpanded || Boolean(searchKeyword.trim()) }"
        >
          <button
            type="button"
            class="nav-search__trigger"
            :aria-expanded="isSearchExpanded || Boolean(searchKeyword.trim())"
            aria-label="打开搜索"
            @click="toggleSearch"
          >
            <Search
              aria-hidden="true"
              class="nav-search__icon"
            />
          </button>
          <div
            class="nav-search__input-wrap"
            :class="{ 'is-visible': isSearchExpanded || Boolean(searchKeyword.trim()) }"
          >
            <input
              ref="searchInputRef"
              v-model="searchKeyword"
              class="nav-search__input"
              type="search"
              placeholder="搜索文章"
              @keydown.enter.prevent="submitSearch"
              @blur="handleSearchBlur"
            >
          </div>
        </div>
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="nav__link"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>
