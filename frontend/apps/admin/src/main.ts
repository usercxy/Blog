import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import pinia from './stores/pinia'
import { registerSessionExpiredHandler, storeSessionExpiredMessage } from './services/api'
import { useAuthStore } from './stores/auth'
import './styles/main.scss'

const app = createApp(App)
const authStore = useAuthStore(pinia)

registerSessionExpiredHandler(async ({ message }) => {
  const currentPath = router.currentRoute.value.fullPath
  const shouldKeepRedirect = currentPath && currentPath !== '/login'

  storeSessionExpiredMessage(message)
  authStore.logout()

  if (router.currentRoute.value.name === 'login') {
    return
  }

  await router.replace({
    name: 'login',
    query: shouldKeepRedirect
      ? {
          redirect: currentPath,
        }
      : undefined,
  })
})

app.use(pinia)
app.use(router)
app.use(ElementPlus)

app.mount('#app')
