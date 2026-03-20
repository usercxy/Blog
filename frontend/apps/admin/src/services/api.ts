interface ApiEnvelope<T> {
  code: number
  message: string
  data: T
}

interface ApiErrorPayload {
  code?: number
  message?: string | string[]
  error?: string
  statusCode?: number
}

interface RequestOptions {
  body?: unknown
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  query?: Record<string, string | number | boolean | undefined>
  token?: string
}

const DEFAULT_API_BASE_URL = 'http://localhost:8000/api'
const SESSION_EXPIRED_FLASH_KEY = 'blog-admin-session-expired-message'

type SessionExpiredHandler = (context: { message: string }) => void | Promise<void>

class AdminApiError extends Error {
  status: number
  code?: number
  originalMessage: string
  isAuthExpired: boolean

  constructor(
    message: string,
    options: {
      status?: number
      code?: number
      originalMessage?: string
      isAuthExpired?: boolean
    } = {},
  ) {
    super(message)
    this.name = 'AdminApiError'
    this.status = options.status ?? 0
    this.code = options.code
    this.originalMessage = options.originalMessage ?? message
    this.isAuthExpired = Boolean(options.isAuthExpired)
  }
}

let sessionExpiredHandler: SessionExpiredHandler | null = null
let isHandlingSessionExpired = false

const getApiBaseUrl = () => (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, '')

const buildUrl = (path: string, query?: RequestOptions['query']) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${getApiBaseUrl()}${normalizedPath}`)

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }

    url.searchParams.set(key, String(value))
  })

  return url.toString()
}

const extractPayloadMessage = (payload: ApiErrorPayload | ApiEnvelope<unknown> | null) => {
  const message = payload?.message

  if (Array.isArray(message)) {
    return message
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join('；')
  }

  if (typeof message === 'string' && message.trim()) {
    return message.trim()
  }

  if (typeof payload?.error === 'string' && payload.error.trim()) {
    return payload.error.trim()
  }

  return ''
}

const normalizeApiErrorMessage = (message: string, status = 0) => {
  const normalized = message.trim()

  if (!normalized) {
    if (status === 400) {
      return '提交的数据有误，请检查后重试。'
    }

    if (status === 401) {
      return '登录状态已失效，请重新登录。'
    }

    if (status === 403) {
      return '你暂无权限执行此操作。'
    }

    if (status === 404) {
      return '请求的资源不存在。'
    }

    if (status === 409) {
      return '数据发生冲突，请检查后重试。'
    }

    if (status >= 500) {
      return '服务器暂时不可用，请稍后再试。'
    }

    return '请求失败，请稍后重试。'
  }

  return normalized
}

const isSessionExpiredError = (status: number, message: string, hadToken: boolean) => {
  if (!hadToken) {
    return false
  }

  if (status === 401) {
    return true
  }

  return /expired access token|missing bearer token|登录状态已失效|登录状态已过期/i.test(message)
}

const handleSessionExpired = async (message: string) => {
  if (!sessionExpiredHandler || isHandlingSessionExpired) {
    return
  }

  isHandlingSessionExpired = true

  try {
    await sessionExpiredHandler({ message })
  } finally {
    isHandlingSessionExpired = false
  }
}

const request = async <T>(path: string, options: RequestOptions = {}) => {
  const hadToken = Boolean(options.token)
  let response: Response

  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch (error) {
    throw new AdminApiError('无法连接到服务器，请检查后端服务是否已启动。', {
      originalMessage: error instanceof Error ? error.message : 'Network error',
    })
  }

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | ApiErrorPayload | null
  const payloadCode = 'code' in (payload ?? {}) ? payload?.code : undefined
  const status = response.status
  const originalMessage = extractPayloadMessage(payload)
  const localizedMessage = normalizeApiErrorMessage(originalMessage, status)
  const authExpired = isSessionExpiredError(status, originalMessage || localizedMessage, hadToken)

  if (!response.ok || !payload || payloadCode !== undefined && payloadCode !== 0) {
    if (authExpired) {
      await handleSessionExpired(localizedMessage)
    }

    throw new AdminApiError(localizedMessage, {
      status,
      code: payloadCode,
      originalMessage: originalMessage || localizedMessage,
      isAuthExpired: authExpired,
    })
  }

  return (payload as ApiEnvelope<T>).data
}

export const apiGet = <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
  request<T>(path, options)

export const apiPost = <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
  request<T>(path, {
    ...options,
    method: 'POST',
    body,
  })

export const apiPut = <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
  request<T>(path, {
    ...options,
    method: 'PUT',
    body,
  })

export const apiDelete = <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
  request<T>(path, {
    ...options,
    method: 'DELETE',
  })

export const registerSessionExpiredHandler = (handler: SessionExpiredHandler) => {
  sessionExpiredHandler = handler
}

export const storeSessionExpiredMessage = (message: string) => {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(SESSION_EXPIRED_FLASH_KEY, message)
}

export const consumeSessionExpiredMessage = () => {
  if (typeof window === 'undefined') {
    return ''
  }

  const message = window.sessionStorage.getItem(SESSION_EXPIRED_FLASH_KEY) ?? ''
  window.sessionStorage.removeItem(SESSION_EXPIRED_FLASH_KEY)
  return message
}

export const getApiErrorMessage = (error: unknown) => {
  if (error instanceof AdminApiError) {
    return error.message
  }

  if (error instanceof Error) {
    return normalizeApiErrorMessage(error.message)
  }

  return '请求失败，请稍后重试。'
}
