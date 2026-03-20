<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import type { ArticleStatus } from '@blog/shared-types'
import { formatFriendlyDateTime } from '@blog/shared-utils'
import { useRouter } from 'vue-router'
import { Delete, EditPen, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCmsStore, type FetchPostsParams } from '../stores/cms'
import { getApiErrorMessage } from '../services/api'
import AdminTableStackCell from '../components/AdminTableStackCell.vue'
import OverflowTooltipText from '../components/OverflowTooltipText.vue'

const router = useRouter()
const cmsStore = useCmsStore()
const PAGE_SIZE = 20
const FETCH_DEBOUNCE_MS = 240

const filters = reactive({
  keyword: '',
  status: 'all' as ArticleStatus | 'all',
})

const pagination = reactive({
  page: 1,
  pageSize: PAGE_SIZE,
  total: 0,
})

const loading = ref(false)

let fetchTimer: ReturnType<typeof setTimeout> | undefined

const statusMeta: Record<ArticleStatus, { label: string; type: 'info' | 'success' | 'warning' }> = {
  draft: { label: '草稿', type: 'info' },
  published: { label: '已发布', type: 'success' },
  hidden: { label: '隐藏', type: 'warning' },
}

const getStatusMeta = (status: ArticleStatus) => statusMeta[status]

const articleSummary = computed(() => {
  if (pagination.total === 0) {
    return '当前没有符合条件的文章。'
  }

  const pageCount = Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
  return `共 ${pagination.total} 篇，当前第 ${pagination.page} / ${pageCount} 页，本页 ${cmsStore.articles.length} 篇`
})

const fetchArticles = async () => {
  loading.value = true

  try {
    const response = await cmsStore.fetchPosts({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filters.keyword,
      status: filters.status,
    } satisfies FetchPostsParams)

    pagination.total = response.total
    pagination.page = response.page
    pagination.pageSize = response.pageSize
  } catch (error) {
    ElMessage.error(getApiErrorMessage(error))
  } finally {
    loading.value = false
  }
}

const scheduleFetchArticles = () => {
  if (fetchTimer) {
    clearTimeout(fetchTimer)
  }

  fetchTimer = setTimeout(() => {
    void fetchArticles()
  }, FETCH_DEBOUNCE_MS)
}

const toEditor = (id?: string) => {
  router.push(id ? `/posts/${id}/edit` : '/posts/create')
}

const handlePageChange = (page: number) => {
  pagination.page = page
}

const removeArticle = async (id: string) => {
  try {
    await ElMessageBox.confirm('删除后文章将无法在前台继续访问，是否继续？', '删除文章', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })

    const currentPageItemCount = cmsStore.articles.length

    await cmsStore.deleteArticle(id)
    ElMessage.success('文章已删除。')

    pagination.total = Math.max(0, pagination.total - 1)

    if (currentPageItemCount === 1 && pagination.page > 1) {
      pagination.page -= 1
      return
    }

    void fetchArticles()
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return
    }

    ElMessage.error(getApiErrorMessage(error))
  }
}

watch(() => filters.keyword, () => {
  pagination.page = 1
})

watch(() => filters.status, () => {
  pagination.page = 1
})

watch(
  () => [filters.keyword, filters.status, pagination.page, pagination.pageSize],
  () => {
    scheduleFetchArticles()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (fetchTimer) {
    clearTimeout(fetchTimer)
  }
})
</script>

<template>
  <div class="content-stack">
    <section class="panel-card table-shell">
      <div class="section-header">
        <div>
          <span class="page-kicker">Publishing Queue</span>
        </div>
        <el-button type="primary" @click="toEditor()">
          新建文章
        </el-button>
      </div>

      <div class="toolbar command-bar command-bar--filters">
        <el-input
          v-model="filters.keyword"
          class="toolbar-field toolbar-field--search"
          placeholder="搜索标题或摘要"
          clearable
        >
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
        </el-input>
        <el-select
          v-model="filters.status"
          class="toolbar-field toolbar-field--status"
        >
          <el-option label="全部状态" value="all" />
          <el-option label="已发布" value="published" />
          <el-option label="草稿" value="draft" />
          <el-option label="隐藏" value="hidden" />
        </el-select>
      </div>

      <el-table
        v-loading="loading"
        :data="cmsStore.articles"
        class="admin-table"
        table-layout="fixed"
        stripe
      >
        <el-table-column label="文章信息" min-width="320">
          <template #default="{ row }">
            <AdminTableStackCell
              :primary="row.title"
              :secondary="row.summary"
              secondary-placeholder="暂无摘要"
              :primary-to="`/posts/${row.id}/preview`"
            />
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusMeta(row.status).type">
              {{ getStatusMeta(row.status).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发布时间" width="150">
          <template #default="{ row }">
            <OverflowTooltipText :content="formatFriendlyDateTime(row.publishedAt)" />
          </template>
        </el-table-column>
        <el-table-column label="最后更新" width="150">
          <template #default="{ row }">
            <OverflowTooltipText :content="formatFriendlyDateTime(row.updatedAt)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="124" align="center">
          <template #default="{ row }">
            <div class="icon-action-group">
              <el-tooltip content="编辑文章" placement="top">
                <el-button
                  class="icon-action-button icon-action-button--primary"
                  text
                  type="primary"
                  aria-label="编辑文章"
                  @click="toEditor(row.id)"
                >
                  <el-icon class="icon-action-button__icon">
                    <EditPen />
                  </el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="删除文章" placement="top">
                <el-button
                  class="icon-action-button icon-action-button--danger"
                  text
                  type="danger"
                  aria-label="删除文章"
                  @click="removeArticle(row.id)"
                >
                  <el-icon class="icon-action-button__icon">
                    <Delete />
                  </el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-pagination">
        <span class="hint-text table-pagination__summary">{{ articleSummary }}</span>
        <el-pagination
          background
          layout="prev, pager, next"
          :current-page="pagination.page"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          :pager-count="5"
          @current-change="handlePageChange"
        />
      </div>
    </section>
  </div>
</template>
