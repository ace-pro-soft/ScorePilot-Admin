// Thin client for the backend admin API (/admin/api). The token lives in localStorage
// for 12 hours; any 401 signs the admin out.

const BASE = '/admin/api'
const TOKEN_KEY = 'sp_admin_token'

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

let onUnauthorized: () => void = () => {}
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn
}

export const token = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export async function api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const t = token.get()
  if (t) headers.Authorization = `Bearer ${t}`
  const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  const text = await res.text()
  let data: any = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { error: 'bad_response', message: text.slice(0, 200) }
  }
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) onUnauthorized()
    throw new ApiError(res.status, data.error ?? 'error', data.message ?? humanize(data.error) ?? `HTTP ${res.status}`)
  }
  return data as T
}

function humanize(code?: string) {
  if (!code) return undefined
  return code.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

export const get = <T = any>(path: string) => api<T>('GET', path)
export const post = <T = any>(path: string, body?: unknown) => api<T>('POST', path, body ?? {})
export const patch = <T = any>(path: string, body: unknown) => api<T>('PATCH', path, body)
export const put = <T = any>(path: string, body: unknown) => api<T>('PUT', path, body)
