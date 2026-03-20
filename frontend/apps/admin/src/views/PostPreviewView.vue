<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { EditPen, View } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import PostEditorPreview from '../components/PostEditorPreview.vue'
import { getApiErrorMessage } from '../services/api'
import { useCmsStore } from '../stores/cms'

const route = useRoute()
const router = useRouter()
const cmsStore = useCmsStore()

const loading = ref(false)

const articleId = computed(() => String(route.params.id ?? ''))
const article = computed(() => cmsStore.getArticleById(articleId.value))

const articleMarkdown = computed(() =>
  article.value?.sections
    .flatMap((section) => section.paragraphs)
    .join('\n\n') ?? '',
)

const loadArticle = async () => {
  if (!articleId.value) {
    return
  }

  loading.value = true

  try {
    await cmsStore.fetchPostById(articleId.value)
  } catch (error) {
    ElMessage.error(getApiErrorMessage(error))
  } finally {
    loading.value = false
  }
}

const goToEdit = () => {
  void router.push(`/posts/${articleId.value}/edit`)
}

onMounted(() => {
  void loadArticle()
})

watch(articleId, () => {
  void loadArticle()
})
</script>

<template>
  <div class="content-stack">
    <section class="panel-card article-preview-shell">
      <div class="section-header article-preview-shell__header">
        <div>
          <span class="page-kicker">
            Article Preview
          </span>
          <h3>{{ article?.title || '文章预览' }}</h3>
          <p>
            {{ article?.summary || '展示文章当前保存内容的后台预览效果，方便先检查排版和信息结构，再决定是否继续编辑。' }}
          </p>
        </div>
        <div class="toolbar article-preview-shell__actions">
          <el-button type="primary" @click="goToEdit">
            <el-icon><EditPen /></el-icon>
            编辑文章
          </el-button>
        </div>
      </div>

      <div v-loading="loading" class="article-preview-layout">
        <template v-if="article">
          <section class="article-preview-main">
            <div v-if="article.cover" class="article-preview-cover">
              <img :src="article.cover" :alt="article.title" />
            </div>
            <div class="article-preview-content">
              <PostEditorPreview :markdown="articleMarkdown" />
            </div>
          </section>
        </template>

        <div v-else-if="!loading" class="empty-state">
          <p>没有找到这篇文章，可能已被删除或当前会话数据尚未同步。</p>
        </div>
      </div>
    </section>
  </div>
</template>
