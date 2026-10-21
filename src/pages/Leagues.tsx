import { useMemo, useState } from 'react'
import {
  Avatar, Button, Chip, InputAdornment, MenuItem, Paper, Stack, Switch, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { get, patch } from '../api'
import { useAuth } from '../auth'
import { ErrorBox, Loading, Mono, PageHeader, useAction, useLoad } from '../components/common'

type League = { id: string; name: string; logo: string; country: string; tier: string; visible: boolean; sort: number; custom: boolean }
const tiers = ['elite', 'strong', 'secondary', 'cup', 'other']

function LeagueRow({ l, writable, onSaved }: { l: League; writable: boolean; onSaved: () => void }) {
  const { run, busy } = useAction()
  const [name, setName] = useState(l.name)
  const [sort, setSort] = useState(String(l.sort))
  const save = (body: Record<string, unknown>, msg: string) => run(() => patch(`/leagues/${l.id}`, body), msg).then((ok) => ok && onSaved())
  return (
    <TableRow sx={{ opacity: l.visible ? 1 : 0.55 }}>
      <TableCell><Avatar src={l.logo} variant="rounded" sx={{ width: 28, height: 28, bgcolor: '#F3F4F6' }}>{l.name?.[0]}</Avatar></TableCell>
      <TableCell><Mono>{l.id}</Mono></TableCell>
      <TableCell>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField size="small" value={name} onChange={(e) => setName(e.target.value)} disabled={!writable} sx={{ minWidth: 220 }} />
          {l.custom && <Chip size="small" label="renamed" />}
        </Stack>
      </TableCell>
      <TableCell>{l.country}</TableCell>
      <TableCell>
        <TextField size="small" select value={l.tier} disabled={!writable || busy} onChange={(e) => save({ tier: e.target.value }, 'Tier saved')} sx={{ minWidth: 130 }}>
          {tiers.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
      </TableCell>
      <TableCell><TextField size="small" value={sort} onChange={(e) => setSort(e.target.value.replace(/[^\d-]/g, ''))} disabled={!writable} sx={{ width: 80 }} /></TableCell>
      <TableCell><Switch checked={l.visible} disabled={!writable || busy} onChange={(e) => save({ visible: e.target.checked }, e.target.checked ? 'League shown' : 'League hidden')} /></TableCell>
      <TableCell align="right">
        {writable && (name !== l.name || sort !== String(l.sort)) && (
          <Button size="small" variant="contained" disabled={busy} onClick={() => save({ name, sort: Number(sort) }, 'League saved')}>Save</Button>
        )}
      </TableCell>
    </TableRow>
  )
}

export default function Leagues() {
  const { can } = useAuth()
  const [q, setQ] = useState('')
  const { data, error, loading, reload } = useLoad(() => get<{ leagues: League[] }>('/leagues'))
  const rows = useMemo(() => (data?.leagues ?? []).filter((l) => !q || `${l.name} ${l.country} ${l.id}`.toLowerCase().includes(q.toLowerCase())), [data, q])
  if (loading && !data) return <Loading />

  return (
    <>
      <PageHeader title="Leagues" subtitle="Catalogue used for grouping, filters and Pick of the Day. New leagues are added automatically as fixtures arrive." />
      <TextField size="small" placeholder="Filter" value={q} onChange={(e) => setQ(e.target.value)} sx={{ mb: 2, minWidth: 280 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
      {error && <ErrorBox error={error} onRetry={reload} />}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow><TableCell /><TableCell>Id</TableCell><TableCell>Name</TableCell><TableCell>Country</TableCell><TableCell>Tier</TableCell><TableCell>Order</TableCell><TableCell>Visible</TableCell><TableCell /></TableRow></TableHead>
            <TableBody>
              {rows.map((l) => <LeagueRow key={`${l.id}-${l.name}-${l.sort}-${l.tier}-${l.visible}`} l={l} writable={can('content.write')} onSaved={reload} />)}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </>
  )
}
