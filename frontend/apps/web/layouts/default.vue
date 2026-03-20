<script setup lang="ts">
import { computed } from 'vue'
import { useSiteStore } from '~/stores/site'

const siteStore = useSiteStore()
await callOnce('site-settings', () => siteStore.fetchSettings())

const footerText = computed(() => siteStore.footerText)
</script>

<template>
  <div class="web-shell">
    <AppHeader />
    <main class="web-main">
      <slot />
      <SiteFooter :text="footerText" />
    </main>
  </div>
</template>
