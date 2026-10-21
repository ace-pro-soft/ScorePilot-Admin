import { useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import {
  Box, Button, Card, CardContent, Chip, Grid, Link, MenuItem, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material'
import { get, post } from '../api'
import { useAuth } from '../auth'
import { EmptyRow, ErrorBox, Loading, Mono, NoteDialog, PageHeader, StatusChip, short, useAction, useLoad, when } from '../components/common'

type Entitlement = { id: number; plan_id: string; source: string; starts_at: string; expires_at: string; revoked_at?: string; note?: string }
type Detail = {
  user: { id: number; email: string; tier: string; premium_until?: string; created_at: string; last_login_at?: string }
  disabled: boolean
  devices: { ID: number; DeviceID: string; Platform: string; AppVersion: string; LastSeenAt: string }[]
  entitlements: Entitlement[]
  invoices: { id: string; status: string; plan: { name: string }; amount: string; method: { asset: string; network: string }; amount_usd: string; created_at: string; tx_hash?: string; tx_url?: string }[]
  favourites: { kind: string; ref_id: string; name: string }[]
  audit: { id: number; action: string; admin_email: string; detail: string; created_at: string }[]
  chat: {
    profile_complete: boolean; name: string; username: string; bio: string; phone: string; phone_verified: boolean
    chat_banned: boolean; last_seen_at?: string; messages: number; reports_against: number; conversations: number
  }
}

export default function UserDetail() {
  const { id } = useParams()
  const { can } = useAuth()
  const { run } = useAction()
  const { data, error, loading, reload } = useLoad(() => get<Detail>(`/users/${id}`), [id])
  const [grantOpen, setGrantOpen] = useState(false)
  const [days, setDays] = useState(7)
  const [source, setSource] = useState('comp')
  const [revoke, setRevoke] = useState<Entitlement | null>(null)
  const [disableOpen, setDisableOpen] = useState(false)
  const [banOpen, setBanOpen] = useState(false)

  if (loading && !data) return <Loading />
  if (error) return <ErrorBox error={error} onRetry={reload} />
  const d = data!
  const writable = can('users.write')

  return (
    <>
      <PageHeader
        title={d.user.email}
        subtitle={`User #${d.user.id} · joined ${when(d.user.created_at)} · last sign-in ${when(d.user.last_login_at)}`}
        actions={writable && (
          <>
            <Button variant="contained" onClick={() => setGrantOpen(true)}>Give Premium days</Button>
            <Button color={d.disabled ? 'primary' : 'error'} variant="outlined" onClick={() => setDisableOpen(true)}>{d.disabled ? 'Enable account' : 'Disable account'}</Button>
          </>
        )}
      />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Plan</Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ my: 1 }}>
                <Chip label={d.user.tier} color={d.user.tier === 'premium' ? 'success' : 'default'} />
                {d.disabled && <Chip label="disabled" color="error" />}
              </Stack>
              <Typography>Premium until: <b>{when(d.user.premium_until)}</b></Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Devices</Typography>
              {d.devices.length === 0 && <Typography color="text.secondary">None linked.</Typography>}
              {d.devices.map((dv) => (
                <Typography key={dv.ID} variant="body2" sx={{ mt: 0.5 }}>
                  <Mono>{short(dv.DeviceID, 8)}</Mono> · {dv.Platform || 'android'} {dv.AppVersion} · {when(dv.LastSeenAt)}
                </Typography>
              ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Follows</Typography>
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {d.favourites.length === 0 && <Typography color="text.secondary">Nothing followed.</Typography>}
                {d.favourites.map((f) => <Chip key={f.kind + f.ref_id} size="small" label={f.name || `${f.kind} ${f.ref_id}`} />)}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="body2" color="text.secondary">Community</Typography>
              {d.chat.profile_complete ? (
                <>
                  <Typography sx={{ mt: 0.5 }}><b>{d.chat.name}</b>{d.chat.username && ` · @${d.chat.username}`}</Typography>
                  {d.chat.bio && <Typography variant="body2" color="text.secondary">{d.chat.bio}</Typography>}
                </>
              ) : <Typography sx={{ mt: 0.5 }} color="text.secondary">No community profile yet.</Typography>}
              <Typography variant="body2" sx={{ mt: 1 }}>
                {d.chat.messages} messages · {d.chat.conversations} chats · {d.chat.reports_against} reports against · last seen {when(d.chat.last_seen_at)}
                {d.chat.phone && ` · ${d.chat.phone}${d.chat.phone_verified ? ' (verified)' : ''}`}
              </Typography>
              {d.chat.chat_banned && <Chip size="small" color="error" label="banned from posting" sx={{ mt: 1 }} />}
            </Box>
            {can('community.write') && (
              <Box>
                <Button variant="outlined" color={d.chat.chat_banned ? 'primary' : 'error'} onClick={() => setBanOpen(true)}>
                  {d.chat.chat_banned ? 'Allow posting again' : 'Ban from posting'}
                </Button>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 1 }}>Premium periods</Typography>
      <Paper sx={{ mb: 3 }}>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow><TableCell>Source</TableCell><TableCell>Plan</TableCell><TableCell>Starts</TableCell><TableCell>Ends</TableCell><TableCell>Note</TableCell><TableCell /></TableRow></TableHead>
            <TableBody>
              {d.entitlements.length === 0 && <EmptyRow cols={6} text="No premium periods." />}
              {d.entitlements.map((e) => (
                <TableRow key={e.id} sx={{ opacity: e.revoked_at ? 0.5 : 1 }}>
                  <TableCell><Chip size="small" label={e.source} /></TableCell>
                  <TableCell>{e.plan_id || '–'}</TableCell>
                  <TableCell>{when(e.starts_at)}</TableCell>
                  <TableCell>{when(e.expires_at)}</TableCell>
                  <TableCell>{e.revoked_at ? `revoked ${when(e.revoked_at)}` : e.note}</TableCell>
                  <TableCell align="right">{writable && !e.revoked_at && <Button size="small" color="error" onClick={() => setRevoke(e)}>Revoke</Button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Typography variant="h6" sx={{ mb: 1 }}>Payments</Typography>
      <Paper sx={{ mb: 3 }}>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow><TableCell>Created</TableCell><TableCell>Plan</TableCell><TableCell>Amount</TableCell><TableCell>Status</TableCell><TableCell>Transaction</TableCell></TableRow></TableHead>
            <TableBody>
              {d.invoices.length === 0 && <EmptyRow cols={5} text="No invoices." />}
              {d.invoices.map((i) => (
                <TableRow key={i.id} hover>
                  <TableCell><Link component={RouterLink} to={`/payments?q=${i.id}`}>{when(i.created_at)}</Link></TableCell>
                  <TableCell>{i.plan?.name}</TableCell>
                  <TableCell>{i.amount} {i.method?.asset} <Typography component="span" variant="caption" color="text.secondary">{i.method?.network} · ${i.amount_usd}</Typography></TableCell>
                  <TableCell><StatusChip status={i.status} /></TableCell>
                  <TableCell>{i.tx_url ? <Link href={i.tx_url} target="_blank" rel="noreferrer"><Mono>{short(i.tx_hash)}</Mono></Link> : <Mono>{short(i.tx_hash)}</Mono>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {d.audit.length > 0 && (
        <>
          <Typography variant="h6" sx={{ mb: 1 }}>Admin actions on this account</Typography>
          <Paper>
            <Table size="small">
              <TableBody>
                {d.audit.map((a) => (
                  <TableRow key={a.id}><TableCell>{when(a.created_at)}</TableCell><TableCell>{a.action}</TableCell><TableCell>{a.admin_email}</TableCell><TableCell><Mono>{a.detail}</Mono></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}

      <NoteDialog
        open={grantOpen}
        title="Give Premium days"
        text="Days are added after the current premium end date, if any."
        confirm={`Give ${days} days`}
        extra={(
          <Stack direction="row" spacing={2}>
            <TextField type="number" label="Days" value={days} onChange={(e) => setDays(Math.max(1, Math.min(3650, Number(e.target.value))))} sx={{ width: 120 }} />
            <TextField select label="Reason" value={source} onChange={(e) => setSource(e.target.value)} sx={{ width: 180 }}>
              <MenuItem value="comp">Compensation</MenuItem>
              <MenuItem value="trial">Trial</MenuItem>
            </TextField>
          </Stack>
        )}
        onClose={() => setGrantOpen(false)}
        onConfirm={async (note) => {
          const ok = await run(() => post(`/users/${id}/grant`, { days, source, note }), `Added ${days} days`)
          if (ok) reload()
          return ok
        }}
      />
      <NoteDialog
        open={!!revoke}
        title="Revoke this premium period"
        text="Later periods move up to fill the gap. Refunds for crypto payments are sent from the wallet by hand."
        confirm="Revoke"
        danger
        onClose={() => setRevoke(null)}
        onConfirm={async (note) => {
          const ok = await run(() => post(`/users/${id}/entitlements/${revoke!.id}/revoke`, { note }), 'Period revoked')
          if (ok) reload()
          return ok
        }}
      />
      <NoteDialog
        open={disableOpen}
        title={d.disabled ? 'Enable this account' : 'Disable this account'}
        text={d.disabled ? 'The user can sign in again.' : 'The user is signed out everywhere and cannot sign in until you enable the account again.'}
        confirm={d.disabled ? 'Enable' : 'Disable'}
        danger={!d.disabled}
        onClose={() => setDisableOpen(false)}
        onConfirm={async (note) => {
          const ok = await run(() => post(`/users/${id}/disable`, { disabled: !d.disabled, note }), d.disabled ? 'Account enabled' : 'Account disabled')
          if (ok) reload()
          return ok
        }}
      />
      <NoteDialog
        open={banOpen}
        title={d.chat.chat_banned ? 'Allow posting again?' : 'Ban from posting?'}
        text={d.chat.chat_banned ? 'They can send messages, react and create groups again.' : 'They can still sign in and read chats, but can no longer send messages, react or create groups.'}
        confirm={d.chat.chat_banned ? 'Allow posting' : 'Ban'}
        danger={!d.chat.chat_banned}
        onClose={() => setBanOpen(false)}
        onConfirm={(note) => run(() => post(`/users/${d.user.id}/chat-ban`, { banned: !d.chat.chat_banned, note }), d.chat.chat_banned ? 'Posting allowed' : 'User banned from posting').then((ok) => { if (ok) reload(); return ok })}
      />
    </>
  )
}
