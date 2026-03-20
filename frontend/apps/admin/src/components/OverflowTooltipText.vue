<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  content?: string | null
  placeholder?: string
}>(), {
  content: '',
  placeholder: '--',
})

const textRef = ref<HTMLElement>()
const isOverflowing = ref(false)

let resizeObserver: ResizeObserver | null = null

const displayText = computed(() => props.content?.trim() || props.placeholder)

const measureOverflow = () => {
  const el = textRef.value

  if (!el) {
    isOverflowing.value = false
    return
  }

  isOverflowing.value = el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight
}

const syncOverflowState = () => {
  void nextTick(() => {
    requestAnimationFrame(measureOverflow)
  })
}

watch(() => props.content, syncOverflowState)

onMounted(() => {
  syncOverflowState()

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      measureOverflow()
    })

    if (textRef.value) {
      resizeObserver.observe(textRef.value)
    }
  }

  window.addEventListener('resize', measureOverflow)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('resize', measureOverflow)
})
</script>

<template>
  <el-tooltip
    :content="displayText"
    :disabled="!content || !isOverflowing"
    placement="top"
    effect="light"
  >
    <span ref="textRef" class="overflow-tooltip-text">
      {{ displayText }}
    </span>
  </el-tooltip>
</template>

<style scoped>
.overflow-tooltip-text {
  display: block;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
