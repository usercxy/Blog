<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getApiErrorMessage } from '../services/api'
import { useCmsStore, type EditableProject } from '../stores/cms'

const route = useRoute()
const router = useRouter()
const cmsStore = useCmsStore()

const projectId = computed(() => route.params.id ? String(route.params.id) : undefined)
const form = reactive<EditableProject>(cmsStore.getEditableProject())
const saving = ref(false)
const coverFileInputRef = ref<HTMLInputElement>()
const coverUploading = ref(false)
const coverPreviewVisible = ref(false)

const sanitizeUploadStem = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const createUploadFilename = (file: File) => {
  const extensionIndex = file.name.lastIndexOf('.')
  const extension = extensionIndex >= 0 ? file.name.slice(extensionIndex) : ''
  const titleStem = sanitizeUploadStem(form.slug || form.title)
  const fileStem = sanitizeUploadStem(extensionIndex >= 0 ? file.name.slice(0, extensionIndex) : file.name)
  const stem = titleStem || fileStem || 'project-cover'
  return `project-cover-${stem}${extension}`
}

const getImageDisplayName = (value: string) => {
  const normalized = value.trim()
  if (!normalized) {
    return ''
  }

  const sanitized = normalized.split('#')[0]?.split('?')[0] ?? normalized
  const segments = sanitized.split('/').filter(Boolean)
  const rawName = segments[segments.length - 1] ?? sanitized

  try {
    return decodeURIComponent(rawName) || rawName
  } catch {
    return rawName
  }
}

const coverDisplayName = computed(() => getImageDisplayName(form.cover))

const openImagePicker = () => {
  if (!coverFileInputRef.value) {
    return
  }

  coverFileInputRef.value.value = ''
  coverFileInputRef.value.click()
}

const handleCoverFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement | null
  const file = target?.files?.[0]

  if (target) {
    target.value = ''
  }

  if (!file) {
    return
  }

  if (file.type && !file.type.startsWith('image/')) {
    ElMessage.warning('当前入口仅支持上传图片文件。')
    return
  }

  coverUploading.value = true

  try {
    const media = await cmsStore.uploadMedia(file, createUploadFilename(file))
    form.cover = media.url
    ElMessage.success('项目封面上传成功，已自动回填链接。')
  } catch (error) {
    ElMessage.error(getApiErrorMessage(error))
  } finally {
    coverUploading.value = false
  }
}

const openCoverPreview = () => {
  if (!form.cover) {
    return
  }

  coverPreviewVisible.value = true
}

const closeCoverPreview = () => {
  coverPreviewVisible.value = false
}

const syncForm = async (id?: string) => {
  try {
    if (id) {
      await cmsStore.fetchProjectById(id)
    }

    Object.assign(form, cmsStore.getEditableProject(id))
  } catch (error) {
    ElMessage.error(getApiErrorMessage(error))
  }
}

watch(projectId, (id) => {
  void syncForm(id)
})

onMounted(() => {
  void syncForm(projectId.value)
})

const saveProject = async () => {
  saving.value = true

  try {
    const project = await cmsStore.saveProject(form)
    ElMessage.success('项目已同步到后端。')
    await router.push(`/projects/${project.id}/edit`)
  } catch (error) {
    ElMessage.error(getApiErrorMessage(error))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="content-stack editor-surface">
    <el-form
      class="panel-card admin-form"
      label-position="top"
    >
      <div class="form-grid">
        <el-form-item label="项目标题">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="项目 Slug">
          <el-input v-model="form.slug" placeholder="留空则根据标题自动生成" />
        </el-form-item>
      </div>

      <div class="form-grid form-grid--3">
        <el-form-item label="项目状态">
          <el-select v-model="form.status">
            <el-option label="草稿" value="draft" />
            <el-option label="已发布" value="published" />
            <el-option label="已归档" value="archived" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序值">
          <el-input-number v-model="form.sortOrder" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="封面图">
          <div class="upload-field">
            <button
              type="button"
              class="media-field"
              :class="{ 'media-field--empty': !form.cover }"
              :disabled="!form.cover"
              @click="openCoverPreview"
            >
              <span class="media-field__label">当前图片</span>
              <strong class="media-field__name">
                {{ coverDisplayName || '尚未上传封面图片' }}
              </strong>
              <small class="media-field__hint">
                {{ form.cover ? '' : '上传后会在这里显示图片名称' }}
              </small>
            </button>
            <div class="upload-field__actions">
              <el-button
                :loading="coverUploading"
                @click="openImagePicker"
              >
                {{ coverUploading ? '上传中...' : '上传封面图' }}
              </el-button>
              <el-button
                v-if="form.cover"
                text
                type="primary"
                @click="openCoverPreview"
              >
                预览图片
              </el-button>
            </div>
            <input
              ref="coverFileInputRef"
              class="visually-hidden-input"
              type="file"
              accept="image/*"
              @change="handleCoverFileChange"
            >
          </div>
        </el-form-item>
      </div>

      <p class="hint-text">排序值越小越靠前，前台会优先展示排序靠前的项目。</p>

      <el-form-item label="项目摘要">
        <el-input
          v-model="form.summary"
          type="textarea"
          :rows="3"
        />
      </el-form-item>

      <div class="form-grid">
        <el-form-item label="在线预览地址">
          <el-input v-model="form.previewUrl" placeholder="https://example.com" />
        </el-form-item>
        <el-form-item label="代码仓库地址">
          <el-input v-model="form.repoUrl" placeholder="https://github.com/..." />
        </el-form-item>
      </div>

      <el-form-item label="项目详情内容">
        <el-input
          v-model="form.content"
          type="textarea"
          :rows="12"
          placeholder="支持录入前台详情页展示的项目介绍、功能说明和复盘内容"
        />
      </el-form-item>

      <div class="toolbar toolbar--between">
        <div class="inline-link-list">
          <el-link
            v-if="form.previewUrl"
            :href="form.previewUrl"
            target="_blank"
            type="primary"
          >
            打开在线预览
          </el-link>
          <el-link
            v-if="form.repoUrl"
            :href="form.repoUrl"
            target="_blank"
            type="primary"
          >
            打开代码仓库
          </el-link>
        </div>

        <div class="toolbar">
          <el-button @click="router.push('/projects')">
            返回列表
          </el-button>
          <el-button type="primary" :loading="saving" @click="saveProject">
            保存项目
          </el-button>
        </div>
      </div>
    </el-form>

    <div
      v-if="coverPreviewVisible && form.cover"
      class="editor-image-preview"
      @click="closeCoverPreview"
    >
      <div class="editor-image-preview__dialog" @click.stop>
        <div class="editor-image-preview__header">
          <div class="editor-image-preview__meta">
            <span class="editor-image-preview__label">图片预览</span>
            <strong>{{ coverDisplayName }}</strong>
          </div>
          <el-button text type="primary" @click="closeCoverPreview">
            关闭
          </el-button>
        </div>
        <div class="editor-image-preview__body">
          <img :src="form.cover" :alt="coverDisplayName || '封面图预览'">
        </div>
      </div>
    </div>
  </div>
</template>
