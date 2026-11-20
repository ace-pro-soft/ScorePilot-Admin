import { useEffect, useState } from 'react'
import {
  Autocomplete, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, LinearProgress, Paper, Radio, RadioGroup, Stack, Switch, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material'
import { ApiError, api, get, patch, post, put, token } from '../api'
import { useAuth } from '../auth'
import { EmptyRow, ErrorBox, Loading, PageHeader, StatusChip, useAction, useLoad, when } from '../components/common'

type UserRef = { id: number; email: string }
type AudienceKind = 'all' | 'users' | 'installed'

type Release = {
  id: number
  platform: string
  version_code: number
  version_name: string
  file: string
  size: number
  sha256: string
  cert_sha256: string
  notes: string
  required: boolean
  status: 'draft' | 'published' | 'withdrawn'
  downloads: number
  uploaded_by: string
  published_at?: string | null
  created_at: string
  base: boolean
  audience: AudienceKind
  installed_from?: string | null
  installed_to?: string | null
  audience_users: UserRef[]
  object_key: string
}

type VersionCount = { version: string; devices: number }
type ReleasesResponse = {
  releases: Release[]; versions: Record<string, VersionCount[]>; package: string; cert_pinned: boolean
  storage?: { kind: 'r2' | 'local'; bucket?: string; public_links?: boolean }
}
type Preview = { devices: number; outdated: number; users: number; sample: UserRef[]; versions: VersionCount[] }

const mb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`

const platformNames: Record<string, string> = {
  android: 'Android',
  'win-x64': 'Windows',
  'win-x64-setup': 'Windows installer',
  'linux-x64': 'Linux',
  'osx-arm64': 'macOS (Apple silicon)',
  'osx-x64': 'macOS (Intel)',
}
const platformName = (platform: string) => platformNames[platform] ?? platform
/** The Windows installer is only a website download, never an update. */
const isInstaller = (platform: string) => platform === 'win-x64-setup'

const day = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : ''

/** "YYYY-MM-DD" in the admin's time zone, for a date input. */
const toDateInput = (iso?: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
/** Local midnight of a date input, as an ISO timestamp (null when empty). */
const fromDateInput = (v: string) => (v ? new Date(`${v}T00:00:00`).toISOString() : null)

function audienceLabel(r: Pick<Release, 'audience' | 'installed_from' | 'installed_to' | 'audience_users'>) {
  switch (r.audience) {
    case 'users':
      return `${r.audience_users.length} chosen ${r.audience_users.length === 1 ? 'user' : 'users'}`
    case 'installed':
      if (r.installed_from && r.installed_to) return `Installed ${day(r.installed_from)} – before ${day(r.installed_to)}`
      if (r.installed_from) return `Installed on or after ${day(r.installed_from)}`
      return `Installed before ${day(r.installed_to)}`
    default:
      return 'Everyone'
  }
}

function AudienceChip({ release }: { release: Release }) {
  const label = audienceLabel(release)
  const chip = <Chip size="small" variant={release.audience === 'all' ? 'outlined' : 'filled'}
    color={release.audience === 'all' ? 'default' : 'info'} label={label} />
  if (release.audience !== 'users') return chip
  const names = release.audience_users.slice(0, 15).map((u) => u.email).join('\n')
  const more = release.audience_users.length > 15 ? `\n…and ${release.audience_users.length - 15} more` : ''
  return <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{names + more}</span>}><span>{chip}</span></Tooltip>
}

/** The files the Android and desktop apps update themselves from (docs/app-updates.md in the backend). */
export default function Releases() {
  const { can } = useAuth()
  const writable = can('ops.write')
  const { run, busy } = useAction()
  const { data, error, loading, reload } = useLoad(() => get<ReleasesResponse>('/releases'))
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editing, setEditing] = useState<Release | null>(null)
  const [targeting, setTargeting] = useState<Release | null>(null)
  if (loading && !data) return error ? <ErrorBox error={error} onRetry={reload} /> : <Loading />
  const releases = data?.releases ?? []
  const platforms = [...new Set(releases.map((r) => r.platform))]
  // What the website hands out: the base release, else the newest published one for everyone.
  const website = platforms.map((p) => {
    const mine = releases.filter((r) => r.platform === p && r.status === 'published')
    return mine.find((r) => r.base) ?? mine.find((r) => r.audience === 'all')
  }).filter((r): r is Release => !!r)
  const onVersion = (r: Release) => data?.versions?.[r.platform]?.find((v) => v.version === r.version_name)?.devices ?? 0

  const act = (r: Release, action: 'publish' | 'withdraw', ok: string) =>
    run(() => post(`/releases/${r.id}/${action}`), ok).then((done) => { if (done) reload() })
  const setBase = (r: Release, on: boolean) =>
    run(() => (on ? post(`/releases/${r.id}/base`) : api('DELETE', `/releases/${r.id}/base`)),
      on ? `The website now hands out ${platformName(r.platform)} ${r.version_name}` : `${r.version_name} is no longer the website download`)
      .then((done) => { if (done) reload() })
  const remove = (r: Release) =>
    run(() => api('DELETE', `/releases/${r.id}`), 'Release deleted').then((done) => { if (done) reload() })

  return (
    <>
      <PageHeader
        title="App releases"
        subtitle={[
          website.length > 0 ? `Website download: ${website.map((r) => `${platformName(r.platform)} ${r.version_name}${r.base ? ' (base)' : ''}`).join(' · ')}` : '',
          data?.storage?.kind === 'r2' ? `Storage: Cloudflare R2 (${data.storage.bucket})` : 'Storage: this server',
        ].filter(Boolean).join('  ·  ')}
        actions={writable && <Button variant="contained" onClick={() => setUploadOpen(true)}>Upload</Button>}
      />
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Platform</TableCell>
              <TableCell>Version</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Offered to</TableCell>
              <TableCell align="right">Size</TableCell>
              <TableCell align="right"><Tooltip title="Devices that last reported this version"><span>On it now</span></Tooltip></TableCell>
              {writable && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {releases.length === 0 && <EmptyRow cols={writable ? 7 : 6} text="No releases yet." />}
            {releases.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{platformName(r.platform)}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Tooltip title={r.notes ? <span style={{ whiteSpace: 'pre-line' }}>{r.notes}</span> : ''}>
                      <Typography fontWeight={600}>{r.version_name}</Typography>
                    </Tooltip>
                    {r.base && (
                      <Tooltip title="Website download"><Chip size="small" color="success" label="base" /></Tooltip>
                    )}
                  </Stack>
                  <Tooltip title={`SHA-256 ${r.sha256} · uploaded ${when(r.created_at)} by ${r.uploaded_by}`}>
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                      code {r.version_code}{r.published_at ? ` · ${day(r.published_at)}` : ''}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    <StatusChip status={r.status} />
                    {r.required && <Chip size="small" color="warning" label="required" />}
                  </Stack>
                </TableCell>
                <TableCell>{isInstaller(r.platform) ? '–' : <AudienceChip release={r} />}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <Typography variant="body2">{mb(r.size)}</Typography>
                  <Typography variant="caption" color="text.secondary">{r.downloads} {r.downloads === 1 ? 'download' : 'downloads'}{r.object_key ? ' · R2' : ''}</Typography>
                </TableCell>
                <TableCell align="right">{isInstaller(r.platform) ? '–' : onVersion(r)}</TableCell>
                {writable && (
                  <TableCell align="right" sx={{ width: 230, minWidth: 210, '& .MuiButton-root': { whiteSpace: 'nowrap' } }}>
                    <Stack direction="row" useFlexGap flexWrap="wrap" justifyContent="flex-end" columnGap={0.5}>
                    <Button size="small" onClick={() => setEditing(r)}>Edit</Button>
                    {r.status !== 'withdrawn' && !isInstaller(r.platform) && <Button size="small" onClick={() => setTargeting(r)}>Audience</Button>}
                    {r.status === 'published' && (
                      <Button size="small" disabled={busy} onClick={() => setBase(r, !r.base)}>{r.base ? 'Unset base' : 'Make base'}</Button>
                    )}
                    {r.status !== 'published' && (
                      <Button size="small" variant="contained" disabled={busy}
                        onClick={() => act(r, 'publish', `${platformName(r.platform)} ${r.version_name} is now offered to: ${audienceLabel(r).toLowerCase()}`)}>Publish</Button>
                    )}
                    {r.status === 'published' && (
                      <Button size="small" color="warning" disabled={busy}
                        onClick={() => act(r, 'withdraw', `${platformName(r.platform)} ${r.version_name} withdrawn`)}>Withdraw</Button>
                    )}
                    {r.status !== 'published' && (
                      <Button size="small" color="error" disabled={busy} onClick={() => remove(r)}>Delete</Button>
                    )}
                    </Stack>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onDone={reload} />
      <EditDialog release={editing} onClose={() => setEditing(null)} onDone={reload} />
      <AudienceDialog release={targeting} onClose={() => setTargeting(null)} onDone={reload} />
    </>
  )
}

/** Uploads with XMLHttpRequest, which (unlike fetch) reports upload progress. */
function uploadRelease(form: FormData, onProgress: (pct: number) => void): Promise<{ release: Release }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/admin/api/releases')
    const t = token.get()
    if (t) xhr.setRequestHeader('Authorization', `Bearer ${t}`)
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)) }
    xhr.onload = () => {
      let data: any = {}
      try { data = JSON.parse(xhr.responseText || '{}') } catch { /* not JSON */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data)
      else reject(new ApiError(xhr.status, data.error ?? 'error', data.message ?? `HTTP ${xhr.status}`))
    }
    xhr.onerror = () => reject(new Error('Upload failed: network error'))
    xhr.send(form)
  })
}

function UploadDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { run } = useAction()
  const [file, setFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [required, setRequired] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const close = () => {
    if (progress !== null) return
    setFile(null); setNotes(''); setRequired(false)
    onClose()
  }
  const submit = async () => {
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    form.append('notes', notes)
    form.append('required', String(required))
    setProgress(0)
    const ok = await run(() => uploadRelease(form, setProgress), 'Uploaded as a draft')
    setProgress(null)
    if (ok) { onDone(); setFile(null); setNotes(''); setRequired(false); onClose() }
  }
  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>Upload a release</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box>
            <Button variant="outlined" component="label" disabled={progress !== null}>
              Choose file
              <input hidden type="file" accept=".apk,.zip,.exe,.AppImage,.dmg,application/vnd.android.package-archive,application/zip"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Button>
            <Typography variant="body2" sx={{ mt: 1 }}>{file ? `${file.name} · ${mb(file.size)}` : 'APK, XWillWin-1.2.3-win-x64.zip, XWillWin-1.2.3-win-x64-setup.exe, .AppImage, .dmg'}</Typography>
          </Box>
          <TextField label="What's new" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={3}
            inputProps={{ maxLength: 4000 }} />
          <FormControlLabel control={<Switch checked={required} onChange={(e) => setRequired(e.target.checked)} />}
            label="Required" />
          {progress !== null && (
            <Box>
              <LinearProgress variant="determinate" value={progress} />
              <Typography variant="caption" color="text.secondary">{progress < 100 ? `Uploading ${progress}%` : 'Checking the file…'}</Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={progress !== null}>Cancel</Button>
        <Button variant="contained" disabled={!file || progress !== null} onClick={submit}>Upload</Button>
      </DialogActions>
    </Dialog>
  )
}

function EditDialog({ release, onClose, onDone }: { release: Release | null; onClose: () => void; onDone: () => void }) {
  const { run, busy } = useAction()
  const [notes, setNotes] = useState('')
  const [required, setRequired] = useState(false)
  const [loadedId, setLoadedId] = useState<number | null>(null)
  if (release && loadedId !== release.id) {
    setLoadedId(release.id)
    setNotes(release.notes)
    setRequired(release.required)
  }
  return (
    <Dialog open={release !== null} onClose={onClose} fullWidth maxWidth="sm" TransitionProps={{ onExited: () => setLoadedId(null) }}>
      <DialogTitle>Edit {release?.version_name}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="What's new" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={3} inputProps={{ maxLength: 4000 }} />
          <FormControlLabel control={<Switch checked={required} onChange={(e) => setRequired(e.target.checked)} />}
            label="Required" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={busy}
          onClick={() => run(() => patch(`/releases/${release!.id}`, { notes, required }), 'Release updated').then((ok) => { if (ok) { onDone(); onClose() } })}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}

/** Who sees a release in the app's update bar: everyone, chosen users, or devices by install date. */
function AudienceDialog({ release, onClose, onDone }: { release: Release | null; onClose: () => void; onDone: () => void }) {
  const { run, busy } = useAction()
  const [loadedId, setLoadedId] = useState<number | null>(null)
  const [kind, setKind] = useState<AudienceKind>('all')
  const [users, setUsers] = useState<UserRef[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<UserRef[]>([])
  const [searching, setSearching] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [previewError, setPreviewError] = useState('')

  if (release && loadedId !== release.id) {
    setLoadedId(release.id)
    setKind(release.audience || 'all')
    setUsers(release.audience_users)
    setFrom(toDateInput(release.installed_from))
    setTo(toDateInput(release.installed_to))
    setPreview(null)
    setPreviewError('')
  }

  const body = { audience: kind, user_ids: users.map((u) => u.id), installed_from: fromDateInput(from), installed_to: fromDateInput(to) }
  const invalid = (kind === 'users' && users.length === 0)
    || (kind === 'installed' && !from && !to)
    || (kind === 'installed' && !!from && !!to && from >= to)
  const bodyKey = JSON.stringify(body)

  // Search accounts by email as the admin types.
  useEffect(() => {
    if (!release || kind !== 'users') return
    const q = query.trim()
    if (q.length < 2) { setOptions([]); return }
    let live = true
    setSearching(true)
    const t = setTimeout(() => {
      get<{ users: UserRef[] }>(`/users?per_page=10&q=${encodeURIComponent(q)}`)
        .then((d) => { if (live) setOptions(d.users.map((u) => ({ id: u.id, email: u.email }))) })
        .catch(() => { if (live) setOptions([]) })
        .finally(() => { if (live) setSearching(false) })
    }, 250)
    return () => { live = false; clearTimeout(t) }
  }, [release, kind, query])

  // Recount the reach whenever the audience changes.
  useEffect(() => {
    if (!release || invalid) { setPreview(null); return }
    let live = true
    const t = setTimeout(() => {
      post<Preview>(`/releases/${release.id}/audience/preview`, JSON.parse(bodyKey))
        .then((p) => { if (live) { setPreview(p); setPreviewError('') } })
        .catch((e) => { if (live) { setPreview(null); setPreviewError(e.message) } })
    }, 300)
    return () => { live = false; clearTimeout(t) }
  }, [release, bodyKey, invalid])

  const save = () => run(() => put(`/releases/${release!.id}/audience`, body), 'Audience saved')
    .then((ok) => { if (ok) { onDone(); onClose() } })

  return (
    <Dialog open={release !== null} onClose={onClose} fullWidth maxWidth="sm" TransitionProps={{ onExited: () => setLoadedId(null) }}>
      <DialogTitle>Who gets {release ? `${platformName(release.platform)} ${release.version_name}` : ''}?</DialogTitle>
      <DialogContent>
        <RadioGroup value={kind} onChange={(e) => setKind(e.target.value as AudienceKind)}>
          <FormControlLabel value="all" control={<Radio />} label="Everyone" />
          <FormControlLabel value="users" control={<Radio />} label="Chosen users" />
          {kind === 'users' && (
            <Autocomplete
              multiple sx={{ ml: 4, mb: 1 }}
              options={options}
              value={users}
              loading={searching}
              filterOptions={(x) => x}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              getOptionLabel={(u) => u.email}
              onChange={(_, v) => setUsers(v)}
              inputValue={query}
              onInputChange={(_, v, reason) => { if (reason !== 'reset') setQuery(v) }}
              noOptionsText={query.trim().length < 2 ? 'Type at least 2 letters of an email' : 'No matching users'}
              renderInput={(params) => (
                <TextField {...params} size="small" label="Search users by email" placeholder={users.length ? '' : 'name@example.com'}
                  InputProps={{ ...params.InputProps, endAdornment: <>{searching ? <CircularProgress size={16} /> : null}{params.InputProps.endAdornment}</> }} />
              )}
            />
          )}
          <FormControlLabel value="installed" control={<Radio />} label="Devices installed in a date range" />
          {kind === 'installed' && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ ml: 4, mb: 1, mt: 0.5 }}>
              <TextField type="date" size="small" label="Installed on or after" value={from} onChange={(e) => setFrom(e.target.value)}
                InputLabelProps={{ shrink: true }} />
              <TextField type="date" size="small" label="Installed before" value={to} onChange={(e) => setTo(e.target.value)}
                InputLabelProps={{ shrink: true }} error={!!from && !!to && from >= to} />
            </Stack>
          )}
        </RadioGroup>
        <Paper variant="outlined" sx={{ p: 1.5, mt: 2, bgcolor: 'action.hover' }}>
          {invalid && <Typography variant="body2" color="text.secondary">{kind === 'users' ? 'Choose at least one user' : 'Set a date range'}</Typography>}
          {!invalid && previewError && <Typography variant="body2" color="error">{previewError}</Typography>}
          {!invalid && !previewError && !preview && <Typography variant="body2" color="text.secondary">Counting…</Typography>}
          {!invalid && preview && (
            <>
              <Typography variant="body2">
                <b>{preview.devices}</b> {preview.devices === 1 ? 'device' : 'devices'} · <b>{preview.outdated}</b> will update
                {' '}· <b>{preview.users}</b> {preview.users === 1 ? 'account' : 'accounts'}
              </Typography>
              {preview.versions.length > 0 && (
                <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                  {preview.versions.map((v) => <Chip key={v.version} size="small" variant="outlined" label={`${v.version} · ${v.devices}`} />)}
                </Stack>
              )}
              {preview.sample.length > 0 && kind !== 'users' && (
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
                  {preview.sample.map((u) => u.email).join(', ')}{preview.users > preview.sample.length ? ', …' : ''}
                </Typography>
              )}
            </>
          )}
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={busy || invalid} onClick={save}>Save audience</Button>
      </DialogActions>
    </Dialog>
  )
}
