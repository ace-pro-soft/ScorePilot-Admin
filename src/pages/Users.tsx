import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Chip, InputAdornment, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TablePagination, TableRow, TextField,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { get } from '../api'
import { EmptyRow, ErrorBox, Loading, PageHeader, useLoad, when } from '../components/common'

type UserRow = {
  id: number; email: string; tier: string; premium_until?: string; created_at: string; last_login_at?: string
  devices: number; favourites: number; paid_invoices: number
}

export default function Users() {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [tier, setTier] = useState('')
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const { data, error, loading, reload } = useLoad(
    () => get<{ users: UserRow[]; total: number }>(`/users?page=${page + 1}&per_page=25&q=${encodeURIComponent(search)}&tier=${tier}`),
    [page, search, tier],
  )

  return (
    <>
      <PageHeader title="Users" subtitle="Accounts created with the email code. Guests (devices only) are not listed." />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField size="small" placeholder="Search email" value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setPage(0); setSearch(q.trim()) } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} sx={{ minWidth: 280 }} />
        <TextField size="small" select label="Tier" value={tier} onChange={(e) => { setPage(0); setTier(e.target.value) }} sx={{ minWidth: 160 }}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="premium">Premium</MenuItem>
          <MenuItem value="free">Free</MenuItem>
          <MenuItem value="disabled">Disabled</MenuItem>
        </TextField>
      </Stack>
      {error && <ErrorBox error={error} onRetry={reload} />}
      {loading && !data ? <Loading /> : (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell><TableCell>Tier</TableCell><TableCell>Premium until</TableCell>
                  <TableCell align="right">Payments</TableCell><TableCell align="right">Devices</TableCell>
                  <TableCell align="right">Follows</TableCell><TableCell>Joined</TableCell><TableCell>Last sign-in</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.users.length === 0 && <EmptyRow cols={8} text="No users match." />}
                {data?.users.map((u) => (
                  <TableRow key={u.id} hover sx={{ cursor: 'pointer' }} onClick={() => nav(`/users/${u.id}`)}>
                    <TableCell>{u.email}</TableCell>
                    <TableCell><Chip size="small" label={u.tier} color={u.tier === 'premium' ? 'success' : 'default'} /></TableCell>
                    <TableCell>{when(u.premium_until)}</TableCell>
                    <TableCell align="right">{u.paid_invoices}</TableCell>
                    <TableCell align="right">{u.devices}</TableCell>
                    <TableCell align="right">{u.favourites}</TableCell>
                    <TableCell>{when(u.created_at)}</TableCell>
                    <TableCell>{when(u.last_login_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination component="div" count={data?.total ?? 0} page={page} rowsPerPage={25} rowsPerPageOptions={[25]} onPageChange={(_, p) => setPage(p)} />
        </Paper>
      )}
    </>
  )
}
