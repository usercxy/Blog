<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { formatFriendlyDateTime } from '@blog/shared-utils'
import { useRouter } from 'vue-router'
import { Delete, EditPen, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getApiErrorMessage } from '../services/api'
import { useCmsStore, type FetchProjectsParams, type ProjectStatus } from '../stores/cms'
import AdminTableStackCell from '../components/AdminTableStackCell.vue'
import OverflowTooltipText from '../components/OverflowTooltipText.vue'

const router = useRouter()
const cmsStore = useCmsStore()
const PAGE_SIZE = 20
const FETCH_DEBOUNCE_MS = 240

const filters = reactive({
  keyword: '',
  status: 'all' as ProjectStatus | 'all',
})

const pagination = reactive({
  page: 1,
  pageSize: PAGE_SIZE,
  total: 0,
})

const loading = ref(false)

let fetchTimer: ReturnType<typeof setTimeout> | undefined

const statusMeta: Record<ProjectStatus, { label: string; type: 'info' | 'success' | 'warning' }> = {
  draft: { label: '草稿', type: 'info' },
  published: { label: '已发布', type: 'success' },
  archived: { label: '已归档', type: 'warning' },
}

const getStatusMeta = (status: ProjectStatus) => statusMeta[status]

const projectSummary = computed(() => {
  if (pagination.total === 0) {
    return '当前没有符合条件的项目。'
  }

  const pageCount = Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
  return `共 ${pagination.total} 个项目，当前第 ${pagination.page} / ${pageCount} 页，本页 ${cmsStore.projects.length} 个`
})

const fetchProjects = async () => {
  loading.value = true

  try {
    const response = await cmsStore.fetchProjects({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filters.keyword,
      status: filters.status,
    } satisfies FetchProjectsParams)

    pagination.total = response.total
    pagination.page = response.page
    pagination.pageSize = response.pageSize
  } catch (error) {
    ElMessage.error(getApiErrorMessage(error))
  } finally {
    loading.value = false
  }
}

const scheduleFetchProjects = () => {
  if (fetchTimer) {
    clearTimeout(fetchTimer)
  }

  fetchTimer = setTimeout(() => {
    void fetchProjects()
  }, FETCH_DEBOUNCE_MS)
}

const toEditor = (id?: string) => {
  router.push(id ? `/projects/${id}/edit` : '/projects/create')
}

const handlePageChange = (page: number) => {
  pagination.page = page
}

const removeProject = async (id: string) => {
  try {
    await ElMessageBox.confirm('删除后前台项目页将无法继续展示该项目，是否继续？', '删除项目', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })

    const currentPageItemCount = cmsStore.projects.length

    await cmsStore.deleteProject(id)
    ElMessage.success('项目已删除。')

    pagination.total = Math.max(0, pagination.total - 1)

    if (currentPageItemCount === 1 && pagination.page > 1) {
      pagination.page -= 1
      return
    }

    void fetchProjects()
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
    scheduleFetchProjects()
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
          <span class="page-kicker">Portfolio Pipeline</span>
        </div>
        <el-button type="primary" @click="toEditor()">
          新建项目
        </el-button>
      </div>

      <div class="toolbar command-bar command-bar--filters">
        <el-input
          v-model="filters.keyword"
          class="toolbar-field toolbar-field--search"
          placeholder="搜索标题、摘要"
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
          <el-option label="草稿" value="draft" />
          <el-option label="已发布" value="published" />
          <el-option label="已归档" value="archived" />
        </el-select>
      </div>

      <el-table
        v-loading="loading"
        :data="cmsStore.projects"
        class="admin-table"
        table-layout="fixed"
        stripe
      >
        <el-table-column label="项目信息" min-width="280">
          <template #default="{ row }">
            <AdminTableStackCell
              :primary="row.title"
              :secondary="row.summary"
              secondary-placeholder="暂无摘要"
            />
          </template>
        </el-table-column>
        <el-table-column label="Slug" min-width="180">
          <template #default="{ row }">
            <OverflowTooltipText :content="row.slug" />
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusMeta(row.status).type">
              {{ getStatusMeta(row.status).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="排序" width="100" align="center">
          <template #default="{ row }">
            {{ row.sortOrder }}
          </template>
        </el-table-column>
        <el-table-column label="前台展示" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="row.featured ? 'success' : 'info'">
              {{ row.featured ? '优先展示' : '正常排序' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最后更新" width="160">
          <template #default="{ row }">
            <OverflowTooltipText :content="formatFriendlyDateTime(row.updatedAt)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="124" align="center">
          <template #default="{ row }">
            <div class="icon-action-group">
              <el-tooltip content="编辑" placement="top">
                <el-button
                  class="icon-action-button icon-action-button--primary"
                  text
                  type="primary"
                  aria-label="编辑"
                  @click="toEditor(row.id)"
                >
                  <el-icon class="icon-action-button__icon">
                    <EditPen />
                  </el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="删除" placement="top">
                <el-button
                  class="icon-action-button icon-action-button--danger"
                  text
                  type="danger"
                  aria-label="删除"
                  @click="removeProject(row.id)"
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
        <span class="hint-text table-pagination__summary">{{ projectSummary }}</span>
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
