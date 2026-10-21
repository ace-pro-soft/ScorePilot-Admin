import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, Link, MenuItem, Paper,
  Stack, Switch, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, ToggleButton,
  ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/DeleteOutline'
import EditIcon from '@mui/icons-material/EditOutlined'
import ForumIcon from '@mui/icons-material/ForumOutlined'
import AdminIcon from '@mui/icons-material/AdminPanelSettingsOutlined'
import { api, get, patch, post, put } from '../api'
import { useAuth } from '../auth'
import { EmptyRow, ErrorBox, Kpi, Loading, PageHeader, ago, useAction, useLoad, when } from '../components/common'

type Overview = {
  profiles: number; online: number; banned: number; open_reports: number; messages_24h: number; messages_7d: number
  communities: number; groups: number; direct_chats: number
}
type ModUser = { id: number; name: string; username: string; email: string; chat_banned: boolean }
type ModMessage = { id: number; conversation_id: number; seq: number; kind: string; body: string; deleted: boolean; created_at: string; edited_at?: string; sender?: ModUser }
type Report = {
  id: number; message: ModMessage; conversation: { id: number; title: string; kind: string }
  reasons: Record<string, number>; notes?: string[]; reporters?: ModUser[]; first_at: string
  resolved_at?: string; resolved_by?: string; resolution?: string
}
type Community = {
  id: number; title: string; about: string; icon: string; league_id: string; slug?: string; official: boolean
  archived: boolean; member_count: number; last_message_at?: string; messages: number
}

const icons = ['community', 'predictions', 'league', 'transfers', 'football']

function Sender({ u }: { u?: ModUser }) {
  if (!u) return <Typography color="text.secondary">system</Typography>
  return (
    <Box>
      <Link component={RouterLink} to={`/users/${u.id}`} fontWeight={600}>{u.name}</Link>
      {u.chat_banned && <Chip size="small" color="error" label="banned" sx={{ ml: 1, height: 20 }} />}
      <Typography variant="body2" color="text.secondary">{u.username ? `@${u.username} · ` : ''}{u.email}</Typography>
    </Box>
  )
}

function Body({ m }: { m: ModMessage }) {
  if (m.deleted) return <Typography color="text.secondary" fontStyle="italic">deleted</Typography>
  return <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxWidth: 420 }}>{m.body}</Typography>
}

function Reports({ writable, onChanged }: { writable: boolean; onChanged: () => void }) {
  const [status, setStatus] = useState<'open' | 'resolved'>('open')
  const { data, error, loading, reload } = useLoad(() => get<{ items: Report[] }>(`/community/reports?status=${status}`), [status])
  const { run, busy } = useAction()
  const [confirm, setConfirm] = useState<{ r: Report; action: 'delete' | 'ban' } | null>(null)
  const resolve = (r: Report, action: string, msg: string) =>
    run(() => post(`/community/reports/${r.id}/resolve`, { action }), msg).then((ok) => { if (ok) { reload(); onChanged() } })

  return (
    <>
      <ToggleButtonGroup size="small" exclusive value={status} onChange={(_, v) => v && setStatus(v)} sx={{ mb: 2 }}>
        <ToggleButton value="open">Open</ToggleButton>
        <ToggleButton value="resolved">Resolved</ToggleButton>
      </ToggleButtonGroup>
      {error && <ErrorBox error={error} onRetry={reload} />}
      {loading && !data ? <Loading /> : (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Message</TableCell><TableCell>Sender</TableCell><TableCell>Where</TableCell>
                  <TableCell>Reasons</TableCell><TableCell>Reported</TableCell><TableCell align="right">{status === 'open' ? 'Action' : 'Outcome'}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.items ?? []).length === 0 && <EmptyRow cols={6} text={status === 'open' ? 'Nothing to review.' : 'No resolved reports yet.'} />}
                {(data?.items ?? []).map((r) => (
                  <TableRow key={r.id} hover sx={{ verticalAlign: 'top' }}>
                    <TableCell>
                      <Body m={r.message} />
                      <Typography variant="caption" color="text.secondary">{when(r.message.created_at)}{r.message.kind === 'prediction' ? ' · prediction card' : ''}</Typography>
                      {(r.notes ?? []).map((n, i) => <Typography key={i} variant="body2" color="text.secondary">“{n}”</Typography>)}
                    </TableCell>
                    <TableCell><Sender u={r.message.sender} /></TableCell>
                    <TableCell>
                      <Typography>{r.conversation.title}</Typography>
                      <Chip size="small" variant="outlined" label={r.conversation.kind} sx={{ height: 20 }} />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {Object.entries(r.reasons).map(([k, n]) => <Chip key={k} size="small" label={n > 1 ? `${k} ×${n}` : k} color={k === 'violence' || k === 'scam' ? 'error' : 'warning'} />)}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">{(r.reporters ?? []).length} {(r.reporters ?? []).length === 1 ? 'person' : 'people'}</Typography>
                    </TableCell>
                    <TableCell>{ago(r.first_at)}</TableCell>
                    <TableCell align="right">
                      {status === 'open' ? (
                        writable && (
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button size="small" disabled={busy} onClick={() => resolve(r, 'dismiss', 'Report dismissed')}>Dismiss</Button>
                            <Button size="small" color="warning" variant="outlined" disabled={busy || r.message.deleted} onClick={() => setConfirm({ r, action: 'delete' })}>Delete</Button>
                            <Button size="small" color="error" variant="contained" disabled={busy} onClick={() => setConfirm({ r, action: 'ban' })}>Delete & ban</Button>
                          </Stack>
                        )
                      ) : (
                        <Box>
                          <Chip size="small" label={r.resolution} color={r.resolution === 'banned' ? 'error' : r.resolution === 'deleted' ? 'warning' : 'default'} />
                          <Typography variant="caption" display="block" color="text.secondary">{r.resolved_by} · {ago(r.resolved_at)}</Typography>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
      <Dialog open={!!confirm} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{confirm?.action === 'ban' ? 'Delete and ban?' : 'Delete message?'}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            {confirm?.action === 'ban'
              ? `The message disappears for everyone and ${confirm?.r.message.sender?.name ?? 'the sender'} can no longer post (they can still read). You can lift the ban on their user page.`
              : 'The message disappears for everyone. The sender is not banned.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={busy} onClick={() => {
            const c = confirm!
            setConfirm(null)
            resolve(c.r, c.action, c.action === 'ban' ? 'Message deleted, sender banned' : 'Message deleted')
          }}>{confirm?.action === 'ban' ? 'Delete & ban' : 'Delete'}</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

function CommunityDialog({ open, initial, onClose, onSaved }: { open: boolean; initial?: Community; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [about, setAbout] = useState(initial?.about ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? 'community')
  const [league, setLeague] = useState(initial?.league_id ?? '')
  const { run, busy } = useAction()
  const save = () => run(
    () => initial ? patch(`/community/conversations/${initial.id}`, { title, about, icon, league_id: league }) : post('/community/communities', { title, about, icon, league_id: league }),
    initial ? 'Community saved' : 'Community created',
  ).then((ok) => { if (ok) { onSaved(); onClose() } })
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initial ? 'Edit community' : 'New community'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} inputProps={{ maxLength: 64 }} />
          <TextField label="Description" value={about} onChange={(e) => setAbout(e.target.value)} multiline minRows={2} inputProps={{ maxLength: 255 }} />
          <Stack direction="row" spacing={2}>
            <TextField select label="Icon" value={icon} onChange={(e) => setIcon(e.target.value)} sx={{ minWidth: 180 }}>
              {icons.map((i) => <MenuItem key={i} value={i}>{i}</MenuItem>)}
            </TextField>
            <TextField label="League id (shows its logo)" value={league} onChange={(e) => setLeague(e.target.value.replace(/\D/g, ''))} helperText="See Leagues for ids" />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={busy || !title.trim()} onClick={save}>{initial ? 'Save' : 'Create'}</Button>
      </DialogActions>
    </Dialog>
  )
}

function MessagesDialog({ community, writable, onClose }: { community: Community; writable: boolean; onClose: () => void }) {
  const { data, error, loading, reload } = useLoad(() => get<{ items: ModMessage[] }>(`/community/conversations/${community.id}/messages`), [community.id])
  const { run, busy } = useAction()
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{community.title} · latest messages</DialogTitle>
      <DialogContent dividers>
        {error && <ErrorBox error={error} onRetry={reload} />}
        {loading && !data ? <Loading /> : (
          <Table size="small">
            <TableBody>
              {(data?.items ?? []).length === 0 && <EmptyRow cols={4} text="No messages yet." />}
              {(data?.items ?? []).map((m) => (
                <TableRow key={m.id} sx={{ verticalAlign: 'top' }}>
                  <TableCell sx={{ width: 200 }}><Sender u={m.sender} /></TableCell>
                  <TableCell><Body m={m} /></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{when(m.created_at)}</TableCell>
                  <TableCell align="right">
                    {writable && !m.deleted && (
                      <Tooltip title="Delete for everyone">
                        <IconButton size="small" disabled={busy} onClick={() => run(() => api('DELETE', `/community/messages/${m.id}`), 'Message deleted').then((ok) => { if (ok) reload() })}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  )
}

type CommunityAdmin = { user: ModUser; role: string; since: string }

/** Who moderates a community in the app: owners and admins can pin and delete messages there. */
function AdminsDialog({ community, writable, onClose }: { community: Community; writable: boolean; onClose: () => void }) {
  const { data, error, loading, reload } = useLoad(() => get<{ items: CommunityAdmin[] }>(`/community/conversations/${community.id}/admins`), [community.id])
  const { run, busy } = useAction()
  const [email, setEmail] = useState('')
  const set = (body: { email?: string; user_id?: number; admin: boolean }, msg: string) =>
    run(() => put(`/community/conversations/${community.id}/admins`, body), msg).then((ok) => { if (ok) { setEmail(''); reload() } })
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{community.title} · admins</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Admins show an “Admin” label in the chat and can pin and delete messages in this community.
        </Typography>
        {error && <ErrorBox error={error} onRetry={reload} />}
        {loading && !data ? <Loading /> : (
          <Table size="small">
            <TableBody>
              {(data?.items ?? []).length === 0 && <EmptyRow cols={3} text="No admins yet." />}
              {(data?.items ?? []).map((a) => (
                <TableRow key={a.user.id}>
                  <TableCell><Sender u={a.user} /></TableCell>
                  <TableCell><Chip size="small" label={a.role} color={a.role === 'owner' ? 'primary' : 'default'} /></TableCell>
                  <TableCell align="right">
                    {writable && a.role === 'admin' && (
                      <Button size="small" color="error" disabled={busy} onClick={() => set({ user_id: a.user.id, admin: false }, 'Admin removed')}>Remove</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {writable && (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <TextField size="small" label="Email of the person to appoint" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth
              helperText="They need a community profile. They join the community if they haven't." />
            <Button variant="contained" disabled={busy || !email.includes('@')} onClick={() => set({ email: email.trim(), admin: true }, 'Admin appointed')} sx={{ alignSelf: 'flex-start', height: 40 }}>
              Appoint
            </Button>
          </Stack>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  )
}

function Communities({ writable }: { writable: boolean }) {
  const { data, error, loading, reload } = useLoad(() => get<{ items: Community[] }>('/community/communities'))
  const { run, busy } = useAction()
  const [editing, setEditing] = useState<Community | 'new' | null>(null)
  const [viewing, setViewing] = useState<Community | null>(null)
  const [admins, setAdmins] = useState<Community | null>(null)
  return (
    <>
      {writable && <Button variant="contained" sx={{ mb: 2 }} onClick={() => setEditing('new')}>New community</Button>}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {loading && !data ? <Loading /> : (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Community</TableCell><TableCell>Icon</TableCell><TableCell align="right">Members</TableCell>
                  <TableCell align="right">Messages</TableCell><TableCell>Last activity</TableCell><TableCell>Live</TableCell><TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.items ?? []).map((c) => (
                  <TableRow key={c.id} hover sx={{ opacity: c.archived ? 0.55 : 1 }}>
                    <TableCell>
                      <Typography fontWeight={600}>{c.title}{c.official && <Chip size="small" label="official" color="success" sx={{ ml: 1, height: 20 }} />}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>{c.about}</Typography>
                    </TableCell>
                    <TableCell>{c.icon}{c.league_id && <Typography variant="caption" display="block" color="text.secondary">league {c.league_id}</Typography>}</TableCell>
                    <TableCell align="right">{c.member_count.toLocaleString()}</TableCell>
                    <TableCell align="right">{c.messages.toLocaleString()}</TableCell>
                    <TableCell>{ago(c.last_message_at)}</TableCell>
                    <TableCell>
                      <Switch checked={!c.archived} disabled={!writable || busy}
                        onChange={(e) => run(() => patch(`/community/conversations/${c.id}`, { archived: !e.target.checked }), e.target.checked ? 'Community restored' : 'Community archived').then((ok) => { if (ok) reload() })} />
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title="Read messages"><IconButton size="small" onClick={() => setViewing(c)}><ForumIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Admins"><IconButton size="small" onClick={() => setAdmins(c)}><AdminIcon fontSize="small" /></IconButton></Tooltip>
                      {writable && <Tooltip title="Edit"><IconButton size="small" onClick={() => setEditing(c)}><EditIcon fontSize="small" /></IconButton></Tooltip>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
      {editing && <CommunityDialog open initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSaved={reload} />}
      {viewing && <MessagesDialog community={viewing} writable={writable} onClose={() => setViewing(null)} />}
      {admins && <AdminsDialog community={admins} writable={writable} onClose={() => setAdmins(null)} />}
    </>
  )
}

export default function Community() {
  const { can } = useAuth()
  const [tab, setTab] = useState(0)
  const { data, error, reload } = useLoad(() => get<Overview>('/community/overview'))
  const writable = can('community.write')
  return (
    <>
      <PageHeader
        title="Community"
        subtitle="Reports from the app, the official communities and posting bans. Private groups and direct chats are only visible through the messages people report."
      />
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}><Kpi label="Open reports" value={data.open_reports} tone={data.open_reports > 0 ? 'warn' : 'good'} sub="messages to review" /></Grid>
          <Grid item xs={6} md={3}><Kpi label="Messages, 24 h" value={data.messages_24h.toLocaleString()} sub={`${data.messages_7d.toLocaleString()} in 7 days`} /></Grid>
          <Grid item xs={6} md={3}><Kpi label="Online now" value={data.online} sub={`${data.profiles.toLocaleString()} community profiles`} /></Grid>
          <Grid item xs={6} md={3}><Kpi label="Chats" value={(data.communities + data.groups).toLocaleString()} sub={`${data.communities} communities · ${data.groups} groups · ${data.direct_chats} direct · ${data.banned} banned`} /></Grid>
        </Grid>
      )}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Reports${data?.open_reports ? ` (${data.open_reports})` : ''}`} />
        <Tab label="Communities" />
      </Tabs>
      {tab === 0 ? <Reports writable={writable} onChanged={reload} /> : <Communities writable={writable} />}
    </>
  )
}
