import { useState } from 'react'
import {
  Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Switch, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material'
import { get, patch, post } from '../api'
import { useAuth } from '../auth'
import { ErrorBox, Loading, PageHeader, useAction, useLoad, when } from '../components/common'

type AdminRow = { id: number; email: string; name: string; role: string; totp_enabled: boolean; disabled: boolean; last_login_at?: string; created_at: string }

const roleHelp: Record<string, string> = {
  owner: 'Everything, including admins and prices',
  ops: 'Sync, cache, settings, leagues, picks, plans and methods',
  support: 'Users, premium grants, payments and transfers',
  editor: 'Leagues, Pick of the Day and app settings',
  viewer: 'Read-only',
}

export default function Admins() {
  const { can, admin: me } = useAuth()
  const writable = can('admins.write')
  const { run, busy } = useAction()
  const { data, error, loading, reload } = useLoad(() => get<{ admins: AdminRow[]; roles: string[] }>('/admins'))
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ email: '', name: '', role: 'support', password: '' })
  if (loading && !data) return <Loading />
  if (error) return <ErrorBox error={error} onRetry={reload} />

  return (
    <>
      <PageHeader title="Admins" subtitle="People who can sign in to this panel. Every write is recorded in the audit log."
        actions={writable && <Button variant="contained" onClick={() => setOpen(true)}>Add admin</Button>} />
      {!writable && <Alert severity="info" sx={{ mb: 2 }}>Only owners can add or change admins.</Alert>}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow><TableCell>Email</TableCell><TableCell>Name</TableCell><TableCell>Role</TableCell><TableCell>Two-factor</TableCell><TableCell>Last sign-in</TableCell><TableCell>Active</TableCell></TableRow></TableHead>
            <TableBody>
              {data!.admins.map((a) => (
                <TableRow key={a.id} sx={{ opacity: a.disabled ? 0.55 : 1 }}>
                  <TableCell>{a.email}{a.id === me?.id && <Chip size="small" label="you" sx={{ ml: 1 }} />}</TableCell>
                  <TableCell>{a.name}</TableCell>
                  <TableCell>
                    <TextField select size="small" value={a.role} disabled={!writable || a.id === me?.id || busy} sx={{ minWidth: 120 }}
                      onChange={(e) => run(() => patch(`/admins/${a.id}`, { role: e.target.value }), 'Role changed').then((ok) => { if (ok) reload() })}>
                      {data!.roles.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                    </TextField>
                  </TableCell>
                  <TableCell>{a.totp_enabled ? <Chip size="small" color="success" label="on" /> : <Chip size="small" label="off" />}</TableCell>
                  <TableCell>{when(a.last_login_at)}</TableCell>
                  <TableCell>
                    <Switch checked={!a.disabled} disabled={!writable || a.id === me?.id || busy}
                      onChange={(e) => run(() => patch(`/admins/${a.id}`, { disabled: !e.target.checked }), e.target.checked ? 'Admin enabled' : 'Admin disabled').then((ok) => { if (ok) reload() })} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Roles</Typography>
      <Stack spacing={0.5}>
        {Object.entries(roleHelp).map(([r, t]) => <Typography key={r} variant="body2"><b>{r}</b>: {t}</Typography>)}
      </Stack>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add admin</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} helperText={roleHelp[form.role]}>
              {data!.roles.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
            <TextField label="Initial password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              helperText="At least 10 characters. Ask them to change it and turn on two-factor." />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={busy || !form.email || form.password.length < 10}
            onClick={() => run(() => post('/admins', form), 'Admin added').then((ok) => { if (ok) { setOpen(false); setForm({ email: '', name: '', role: 'support', password: '' }); reload() } })}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
