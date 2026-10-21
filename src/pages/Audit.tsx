import { useState } from 'react'
import {
  MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField,
} from '@mui/material'
import { get } from '../api'
import { EmptyRow, ErrorBox, Loading, Mono, PageHeader, useLoad, when } from '../components/common'

type Entry = { id: number; admin_email: string; action: string; entity: string; entity_id: string; detail: string; ip: string; created_at: string }
const entities = ['', 'user', 'invoice', 'transfer', 'plan', 'payment_method', 'league', 'pick_of_day', 'settings', 'job', 'cache', 'admin']

function pretty(detail: string) {
  if (!detail || detail === 'null') return ''
  try {
    const v = JSON.parse(detail)
    return Object.entries(v).map(([k, x]) => `${k}=${typeof x === 'object' ? JSON.stringify(x) : x}`).join('  ')
  } catch {
    return detail
  }
}

export default function Audit() {
  const [entity, setEntity] = useState('')
  const [adminQ, setAdminQ] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const { data, error, loading, reload } = useLoad(
    () => get<{ entries: Entry[]; total: number }>(`/audit?page=${page + 1}&per_page=50&entity=${entity}&admin=${encodeURIComponent(search)}`),
    [page, entity, search],
  )

  return (
    <>
      <PageHeader title="Audit log" subtitle="Every admin write, newest first." />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField size="small" select label="Entity" value={entity} onChange={(e) => { setEntity(e.target.value); setPage(0) }} sx={{ minWidth: 180 }}>
          {entities.map((e) => <MenuItem key={e} value={e}>{e || 'All'}</MenuItem>)}
        </TextField>
        <TextField size="small" label="Admin email" value={adminQ} onChange={(e) => setAdminQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(adminQ.trim()); setPage(0) } }} />
      </Stack>
      {error && <ErrorBox error={error} onRetry={reload} />}
      {loading && !data ? <Loading /> : (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow><TableCell>When</TableCell><TableCell>Admin</TableCell><TableCell>Action</TableCell><TableCell>Target</TableCell><TableCell>Detail</TableCell><TableCell>IP</TableCell></TableRow></TableHead>
              <TableBody>
                {data?.entries.length === 0 && <EmptyRow cols={6} text="No entries." />}
                {data?.entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{when(e.created_at)}</TableCell>
                    <TableCell>{e.admin_email}</TableCell>
                    <TableCell><Mono>{e.action}</Mono></TableCell>
                    <TableCell>{e.entity} {e.entity_id && <Mono>{e.entity_id.slice(0, 12)}</Mono>}</TableCell>
                    <TableCell sx={{ maxWidth: 420, wordBreak: 'break-word' }}><Mono>{pretty(e.detail)}</Mono></TableCell>
                    <TableCell>{e.ip}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination component="div" count={data?.total ?? 0} page={page} rowsPerPage={50} rowsPerPageOptions={[50]} onPageChange={(_, p) => setPage(p)} />
        </Paper>
      )}
    </>
  )
}
