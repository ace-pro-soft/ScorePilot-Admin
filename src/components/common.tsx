import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Snackbar, Stack, TableCell, TableRow, TextField, Typography,
} from '@mui/material'
import { ApiError } from '../api'

// ---- data loading ----

export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const fnRef = useRef(fn)
  fnRef.current = fn
  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fnRef.current())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload() }, deps)
  return { data, error, loading, reload, setData }
}

// ---- toasts ----

type Toast = { msg: string; severity: 'success' | 'error' | 'info' }
const ToastCtx = createContext<(msg: string, severity?: Toast['severity']) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const show = useCallback((msg: string, severity: Toast['severity'] = 'success') => setToast({ msg, severity }), [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>{toast.msg}</Alert> : undefined}
      </Snackbar>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)

/** Runs an action, shows success or the API error as a toast, returns success. */
export function useAction() {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const run = useCallback(async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true)
    try {
      await fn()
      toast(ok)
      return true
    } catch (e) {
      toast(e instanceof ApiError || e instanceof Error ? e.message : String(e), 'error')
      return false
    } finally {
      setBusy(false)
    }
  }, [toast])
  return { run, busy }
}

// ---- layout bits ----

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'flex-end' }} sx={{ mb: 3 }}>
      <Box>
        <Typography variant="h4">{title}</Typography>
        {subtitle && <Typography color="text.secondary">{subtitle}</Typography>}
      </Box>
      {actions && <Stack direction="row" spacing={1}>{actions}</Stack>}
    </Stack>
  )
}

export function Loading() {
  return <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>
}

export function ErrorBox({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return <Alert severity="error" action={onRetry && <Button color="inherit" onClick={onRetry}>Retry</Button>} sx={{ mb: 2 }}>{error}</Alert>
}

export function Kpi({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'good' | 'warn' | 'bad' }) {
  const color = tone === 'good' ? 'success.main' : tone === 'warn' ? 'warning.main' : tone === 'bad' ? 'error.main' : 'primary.main'
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="h4" sx={{ color, my: 0.5 }}>{value}</Typography>
        {sub && <Typography variant="body2" color="text.secondary">{sub}</Typography>}
      </CardContent>
    </Card>
  )
}

export function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>{text}</TableCell>
    </TableRow>
  )
}

// ---- formatting ----

export function when(iso?: string | null) {
  if (!iso || iso.startsWith('0001-')) return '–'
  const d = new Date(iso)
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function ago(iso?: string | null) {
  if (!iso || iso.startsWith('0001-')) return 'never'
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  return `${Math.round(s / 86400)} d ago`
}

export const usd = (cents?: number) => (cents == null ? '–' : `$${(cents / 100).toFixed(2)}`)

const statusTone: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  paid: 'success', credited: 'success', pending: 'info', confirming: 'warning', review: 'warning', matched: 'warning',
  unmatched: 'warning', expired: 'default', cancelled: 'default', ignored: 'default', rejected: 'error',
}

export function StatusChip({ status }: { status?: string }) {
  return <Chip size="small" label={status ?? '–'} color={statusTone[status ?? ''] ?? 'default'} variant={statusTone[status ?? ''] ? 'filled' : 'outlined'} />
}

// ---- dialogs ----

/** Asks for a note (required by the API for money decisions) before running an action. */
export function NoteDialog({ open, title, text, confirm, danger, onClose, onConfirm, extra }: {
  open: boolean
  title: string
  text?: ReactNode
  confirm: string
  danger?: boolean
  extra?: ReactNode
  onClose: () => void
  onConfirm: (note: string) => Promise<boolean | void>
}) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setNote('') }, [open])
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {text && <Typography sx={{ mb: 2 }} color="text.secondary">{text}</Typography>}
        {extra}
        <TextField autoFocus fullWidth label="Note (kept in the audit log)" value={note} onChange={(e) => setNote(e.target.value)} multiline minRows={2} inputProps={{ maxLength: 200 }} sx={{ mt: 1 }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          color={danger ? 'error' : 'primary'}
          disabled={!note.trim() || busy}
          onClick={async () => {
            setBusy(true)
            const ok = await onConfirm(note.trim())
            setBusy(false)
            if (ok !== false) onClose()
          }}
        >
          {confirm}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export function Mono({ children }: { children: ReactNode }) {
  return <Box component="span" sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13 }}>{children}</Box>
}

export function short(s?: string, n = 10) {
  if (!s) return '–'
  return s.length > n * 2 ? `${s.slice(0, n)}…${s.slice(-6)}` : s
}
