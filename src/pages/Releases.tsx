import { useState } from 'react'
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, LinearProgress, Paper,
  Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material'
import { ApiError, api, get, patch, post, token } from '../api'
import { useAuth } from '../auth'
import { EmptyRow, ErrorBox, Loading, Mono, PageHeader, StatusChip, short, useAction, useLoad, when } from '../components/common'

type Release = {
  id: number
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
}

type ReleasesResponse = { releases: Release[]; package: string; cert_pinned: boolean }

const mb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`

/** APKs the Android app updates itself from (docs/app-updates.md in the backend). */
export default function Releases() {
  const { can } = useAuth()
  const writable = can('ops.write')
  const { run, busy } = useAction()
  const { data, error, loading, reload } = useLoad(() => get<ReleasesResponse>('/releases'))
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editing, setEditing] = useState<Release | null>(null)
  if (loading && !data) return error ? <ErrorBox error={error} onRetry={reload} /> : <Loading />
  const releases = data?.releases ?? []
  const live = releases.find((r) => r.status === 'published')

  const act = (r: Release, action: 'publish' | 'withdraw', ok: string) =>
    run(() => post(`/releases/${r.id}/${action}`), ok).then((done) => { if (done) reload() })
  const remove = (r: Release) =>
    run(() => api('DELETE', `/releases/${r.id}`), 'Release deleted').then((done) => { if (done) reload() })

  return (
    <>
      <PageHeader
        title="App releases"
        subtitle={`APKs the Android app (${data?.package ?? 'com.football.scorepilot'}) updates itself from. ${live ? `Offered now: ${live.version_name} (${live.version_code}).` : 'Nothing is offered yet.'}`}
        actions={writable && <Button variant="contained" onClick={() => setUploadOpen(true)}>Upload APK</Button>}
      />
      {!data?.cert_pinned && releases.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Uploads must be signed with the key of the latest release. To pin the key on the server, set
          {' '}<Mono>RELEASE_CERT_SHA256={releases[0].cert_sha256}</Mono>
        </Alert>
      )}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Version</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>What's new</TableCell>
              <TableCell align="right">Size</TableCell>
              <TableCell align="right">Downloads</TableCell>
              <TableCell>SHA-256</TableCell>
              <TableCell>Uploaded</TableCell>
              <TableCell>Published</TableCell>
              {writable && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {releases.length === 0 && <EmptyRow cols={writable ? 9 : 8} text="No releases yet. Upload a signed APK to start." />}
            {releases.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>
                  <Typography fontWeight={600}>{r.version_name}</Typography>
                  <Typography variant="caption" color="text.secondary">code {r.version_code}</Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    <StatusChip status={r.status} />
                    {r.required && <Chip size="small" color="warning" label="required" />}
                  </Stack>
                </TableCell>
                <TableCell sx={{ maxWidth: 320, whiteSpace: 'pre-line' }}>
                  <Typography variant="body2" color={r.notes ? 'text.primary' : 'text.secondary'}>{r.notes || '–'}</Typography>
                </TableCell>
                <TableCell align="right">{mb(r.size)}</TableCell>
                <TableCell align="right">{r.downloads}</TableCell>
                <TableCell><Tooltip title={r.sha256}><span><Mono>{short(r.sha256, 12)}</Mono></span></Tooltip></TableCell>
                <TableCell>
                  <Typography variant="body2">{when(r.created_at)}</Typography>
                  <Typography variant="caption" color="text.secondary">{r.uploaded_by}</Typography>
                </TableCell>
                <TableCell>{when(r.published_at)}</TableCell>
                {writable && (
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Button size="small" onClick={() => setEditing(r)}>Edit</Button>
                    {r.status !== 'published' && (
                      <Button size="small" variant="contained" disabled={busy}
                        onClick={() => act(r, 'publish', `${r.version_name} is now offered to the app`)}>Publish</Button>
                    )}
                    {r.status === 'published' && (
                      <Button size="small" color="warning" disabled={busy}
                        onClick={() => act(r, 'withdraw', `${r.version_name} withdrawn`)}>Withdraw</Button>
                    )}
                    {r.status !== 'published' && (
                      <Button size="small" color="error" disabled={busy} onClick={() => remove(r)}>Delete</Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        A required release keeps the update bar on screen in the app until the user updates; the app is never blocked.
        Withdrawing stops offering a release; phones that installed it keep it.
      </Typography>
      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onDone={reload} />
      <EditDialog release={editing} onClose={() => setEditing(null)} onDone={reload} />
    </>
  )
}

/** Uploads with XMLHttpRequest, which (unlike fetch) reports upload progress. */
function uploadApk(form: FormData, onProgress: (pct: number) => void): Promise<{ release: Release }> {
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
    const ok = await run(() => uploadApk(form, setProgress), 'APK uploaded as a draft. Publish it to offer it to the app.')
    setProgress(null)
    if (ok) { onDone(); setFile(null); setNotes(''); setRequired(false); onClose() }
  }
  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>Upload APK</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          A signed release APK with a higher version code than every earlier release. The server reads the version from the file.
        </Typography>
        <Stack spacing={2}>
          <Box>
            <Button variant="outlined" component="label" disabled={progress !== null}>
              Choose APK
              <input hidden type="file" accept=".apk,application/vnd.android.package-archive"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Button>
            <Typography variant="body2" sx={{ mt: 1 }}>{file ? `${file.name} · ${mb(file.size)}` : 'No file chosen'}</Typography>
          </Box>
          <TextField label="What's new" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={3}
            inputProps={{ maxLength: 4000 }} helperText="Shown in the app's update sheet. One change per line." />
          <FormControlLabel control={<Switch checked={required} onChange={(e) => setRequired(e.target.checked)} />}
            label="Required: the update bar cannot be closed until users update" />
          {progress !== null && (
            <Box>
              <LinearProgress variant="determinate" value={progress} />
              <Typography variant="caption" color="text.secondary">{progress < 100 ? `Uploading ${progress}%` : 'Checking the APK…'}</Typography>
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
            label="Required: the update bar cannot be closed until users update" />
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
