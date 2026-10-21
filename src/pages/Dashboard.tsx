import { Link as RouterLink } from 'react-router-dom'
import {
  Alert, Box, Button, Card, CardContent, Chip, Grid, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import { get } from '../api'
import { ErrorBox, Kpi, Loading, PageHeader, ago, useLoad } from '../components/common'
import { brand } from '../theme'

type Dash = {
  users: { total: number; new_7d: number; premium_active: number; new_devices_7d: number }
  revenue: { usd_30d: string; paid_30d: number; usd_total: string; paid_total: number; daily: { day: string; cents: number; n: number }[]; by_method: { method_id: string; n: number; cents: number }[] }
  invoices_30d: Record<string, number>
  queues: { review: number; unmatched_transfers: number }
  fixtures: number
  jobs: Record<string, { last_ok: string; last_error?: string; last_run_ms: number }>
  watchers: { chain: string; address: string; dev_placeholder?: boolean; active: boolean; last_ok?: string; last_error?: string; transfers_seen: number }[]
  settings: { banner: string; checkout_enabled: boolean; free_pick_visibility: string }
}

function RevenueChart({ daily }: { daily: Dash['revenue']['daily'] }) {
  const days: { day: string; cents: number }[] = []
  const map = new Map(daily.map((d) => [d.day, d.cents]))
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
    days.push({ day: d, cents: map.get(d) ?? 0 })
  }
  const max = Math.max(1, ...days.map((d) => d.cents))
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: 120 }}>
      {days.map((d) => (
        <Box key={d.day} title={`${d.day}: $${(d.cents / 100).toFixed(2)}`}
          sx={{ flex: 1, height: `${Math.max(2, (d.cents / max) * 100)}%`, bgcolor: d.cents ? brand.emerald : '#E5E7EB', borderRadius: '3px 3px 0 0' }} />
      ))}
    </Box>
  )
}

export default function Dashboard() {
  const { data, error, loading, reload } = useLoad(() => get<Dash>('/dashboard'))
  if (loading && !data) return <Loading />
  if (error) return <ErrorBox error={error} onRetry={reload} />
  const d = data!
  const failingJobs = Object.entries(d.jobs).filter(([, j]) => j.last_error)
  const failingWatchers = d.watchers.filter((w) => w.last_error)

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Accounts, Premium, crypto revenue and system health."
        actions={<Button startIcon={<RefreshIcon />} onClick={reload}>Refresh</Button>} />
      {!d.settings.checkout_enabled && <Alert severity="warning" sx={{ mb: 2 }}>Checkout is paused in App settings. Users cannot start new payments.</Alert>}
      {d.settings.banner && <Alert severity="info" sx={{ mb: 2 }}>In-app banner: “{d.settings.banner}”</Alert>}
      {(d.queues.review > 0 || d.queues.unmatched_transfers > 0) && (
        <Alert severity="warning" sx={{ mb: 2 }} action={<Button color="inherit" component={RouterLink} to="/payments?status=review">Review</Button>}>
          {d.queues.review} payment(s) waiting for review, {d.queues.unmatched_transfers} unmatched transfer(s).
        </Alert>
      )}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} md={3}><Kpi label="Accounts" value={d.users.total} sub={`+${d.users.new_7d} in 7 days`} /></Grid>
        <Grid item xs={6} md={3}><Kpi label="Premium now" value={d.users.premium_active} sub={`${d.users.total ? Math.round((d.users.premium_active / d.users.total) * 100) : 0}% of accounts`} tone="good" /></Grid>
        <Grid item xs={6} md={3}><Kpi label="Revenue, 30 days" value={`$${d.revenue.usd_30d}`} sub={`${d.revenue.paid_30d} payments`} /></Grid>
        <Grid item xs={6} md={3}><Kpi label="Revenue, all time" value={`$${d.revenue.usd_total}`} sub={`${d.revenue.paid_total} payments`} /></Grid>
      </Grid>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Daily revenue (USD, last 30 days)</Typography>
              <RevenueChart daily={d.revenue.daily ?? []} />
              <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}>
                {Object.entries(d.invoices_30d).map(([s, n]) => <Chip key={s} size="small" label={`${s}: ${n}`} />)}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Paid by method</Typography>
              {d.revenue.by_method?.length ? d.revenue.by_method.map((m) => (
                <Stack key={m.method_id} direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
                  <Typography>{m.method_id}</Typography>
                  <Typography color="text.secondary">{m.n} · ${(m.cents / 100).toFixed(2)}</Typography>
                </Stack>
              )) : <Typography color="text.secondary">No payments yet.</Typography>}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Sync jobs</Typography>
                <Chip size="small" color={failingJobs.length ? 'error' : 'success'} label={failingJobs.length ? `${failingJobs.length} failing` : 'healthy'} />
              </Stack>
              <Table size="small">
                <TableHead><TableRow><TableCell>Job</TableCell><TableCell>Last success</TableCell><TableCell align="right">Duration</TableCell></TableRow></TableHead>
                <TableBody>
                  {Object.entries(d.jobs).sort().map(([name, j]) => (
                    <TableRow key={name}>
                      <TableCell>{name}{j.last_error && <Typography variant="caption" color="error" display="block">{j.last_error.slice(0, 90)}</Typography>}</TableCell>
                      <TableCell>{ago(j.last_ok)}</TableCell>
                      <TableCell align="right">{j.last_run_ms} ms</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{d.fixtures} fixtures in memory.</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Chain watchers</Typography>
                <Chip size="small" color={failingWatchers.length ? 'error' : 'success'} label={failingWatchers.length ? `${failingWatchers.length} failing` : 'healthy'} />
              </Stack>
              <Table size="small">
                <TableHead><TableRow><TableCell>Chain</TableCell><TableCell>State</TableCell><TableCell>Last scan</TableCell></TableRow></TableHead>
                <TableBody>
                  {d.watchers.map((w) => (
                    <TableRow key={w.chain}>
                      <TableCell>{w.chain}{w.dev_placeholder && <Chip size="small" label="dev" sx={{ ml: 1 }} />}</TableCell>
                      <TableCell>{w.last_error ? <Typography variant="caption" color="error">{w.last_error.slice(0, 60)}</Typography> : w.active ? 'scanning' : 'idle'}</TableCell>
                      <TableCell>{ago(w.last_ok)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Chains are read only while invoices are open.</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  )
}
