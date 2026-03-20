<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { consumeSessionExpiredMessage, getApiErrorMessage } from '../services/api'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const form = reactive({
  username: 'admin',
  password: 'admin123456',
})

const submitLogin = async () => {
  loading.value = true

  try {
    await authStore.login(form)
    ElMessage.success('登录成功，已接入后端管理接口。')
    await router.push(String(route.query.redirect ?? '/dashboard'))
  } catch (error) {
    ElMessage.error(getApiErrorMessage(error))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const message = consumeSessionExpiredMessage()

  if (message) {
    ElMessage.warning(message)
  }
})
</script>

<template>
  <div class="login-screen">
    <section class="login-card">
      <span class="login-card__eyebrow">Admin Login</span>
      <h1 style="margin: 25px 0 10px;">管理后台登录页</h1>
      <el-form
        class="admin-form"
        label-position="top"
        @submit.prevent="submitLogin"
      >
        <el-form-item label="用户名">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
          />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="请输入密码"
          />
        </el-form-item>
        <button
          class="login-card__action"
          type="button"
          :disabled="loading"
          @click="submitLogin"
        >
          {{ loading ? '登录中...' : '登录后台' }}
        </button>
      </el-form>
      <p class="login-tip">默认种子账号：`admin / admin123456`</p>
    </section>
  </div>
</template>
