<script setup lang="ts">
import OverflowTooltipText from './OverflowTooltipText.vue'

defineProps<{
  primary?: string | null
  secondary?: string | null
  primaryPlaceholder?: string
  secondaryPlaceholder?: string
  primaryTo?: string
}>()
</script>

<template>
  <div class="cell-stack">
    <RouterLink
      v-if="primaryTo"
      :to="primaryTo"
      class="cell-stack__title-link"
    >
      <OverflowTooltipText
        class="cell-stack__title"
        :content="primary"
        :placeholder="primaryPlaceholder ?? '--'"
      />
    </RouterLink>
    <OverflowTooltipText
      v-else
      class="cell-stack__title"
      :content="primary"
      :placeholder="primaryPlaceholder ?? '--'"
    />
    <OverflowTooltipText
      class="cell-stack__meta"
      :content="secondary"
      :placeholder="secondaryPlaceholder ?? '暂无摘要'"
    />
  </div>
</template>
