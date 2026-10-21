import { useState } from 'react'
import {
  Button, Card, CardContent, Chip, Grid, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material'
import PlayIcon from '@mui/icons-material/PlayArrow'
import { get, post } from '../api'
import { useAuth } from '../auth'
import { ErrorBox, Loading, Mono, PageHeader, ago, short, useAction, useLoad } from '../components/common'

type SyncInfo = {
  jobs: Record<string, { last_ok: string; last_error?: string; last_run_ms: number }>
  job_names: string[]
  cache: Record<string, number>
  cache_keys: number
  fixtures: number
  watchers: { chain: string; address: string; dev_placeholder?: boolean; active: boolean; last_scan?: string; last_ok?: string; last_error?: string; transfers_seen: number }[]
}

export default function Operations() {
  const { can } = useAuth()
  const ops = can('ops.write')
  const { run, busy } = useAction()
  const [prefix, setPrefix] = useState('')
  const { data, error, loading, reload } = useLoad(() => get<SyncInfo>('/sync'))
  if (loading && !data) return <Loading />
  if (error) return <ErrorBox error={error} onRetry={reload} />
  const d = data!

  return (
    <>
      <PageHeader title="Sync & cache" subtitle="Upstream polling jobs, the in-process cache and the chain watchers." actions={<Button onClick={reload}>Refresh</Button>} />
      <Grid container spacing={2}>
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Jobs</Typography>
              <Table size="small">
                <TableHead><TableRow><TableCell>Job</TableCell><TableCell>Last success</TableCell><TableCell align="right">Duration</TableCell><TableCell /></TableRow></TableHead>
                <TableBody>
                  {d.job_names.map((name) => {
                    const j = d.jobs[name]
                    return (
                      <TableRow key={name}>
                        <TableCell>
                          <Mono>{name}</Mono>
                          {j?.last_error && <Typography variant="caption" color="error" display="block">{j.last_error.slice(0, 120)}</Typography>}
                        </TableCell>
                        <TableCell>{ago(j?.last_ok)}</TableCell>
                        <TableCell align="right">{j ? `${j.last_run_ms} ms` : '–'}</TableCell>
                        <TableCell align="right">
                          {ops && <Button size="small" startIcon={<PlayIcon />} disabled={busy}
                            onClick={() => run(() => post(`/sync/${name}/run`), `${name} finished`).then(() => reload())}>Run now</Button>}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Cache</Typography>
              <Typography color="text.secondary" sx={{ mb: 1 }}>{d.cache_keys} keys · {d.fixtures} fixtures tracked</Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1, mb: 2 }}>
                {Object.entries(d.cache).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
                  <Chip key={k} label={`${k}: ${n}`} onClick={() => setPrefix(`${k}:`)} size="small" />
                ))}
              </Stack>
              {ops && (
                <Stack direction="row" spacing={1}>
                  <TextField size="small" label="Key prefix" placeholder="detail:19872608" value={prefix} onChange={(e) => setPrefix(e.target.value)} sx={{ flex: 1 }}
                    helperText="Empty purges everything; data is fetched again on demand." />
                  <Button color="warning" variant="outlined" disabled={busy}
                    onClick={() => run(() => post('/cache/purge', { prefix }), prefix ? `Purged ${prefix}*` : 'Cache cleared').then(() => reload())}>Purge</Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Chain watchers</Typography>
              <Table size="small">
                <TableHead><TableRow><TableCell>Chain</TableCell><TableCell>Address</TableCell><TableCell>State</TableCell><TableCell>Last scan</TableCell><TableCell>Last success</TableCell><TableCell align="right">Transfers seen</TableCell></TableRow></TableHead>
                <TableBody>
                  {d.watchers.map((w) => (
                    <TableRow key={w.chain}>
                      <TableCell>{w.chain}</TableCell>
                      <TableCell><Mono>{short(w.address, 10)}</Mono>{w.dev_placeholder && <Chip size="small" label="dev placeholder" sx={{ ml: 1 }} />}</TableCell>
                      <TableCell>{w.last_error ? <Typography variant="caption" color="error">{w.last_error.slice(0, 80)}</Typography> : <Chip size="small" label={w.active ? 'scanning' : 'idle'} color={w.active ? 'success' : 'default'} />}</TableCell>
                      <TableCell>{ago(w.last_scan)}</TableCell>
                      <TableCell>{ago(w.last_ok)}</TableCell>
                      <TableCell align="right">{w.transfers_seen}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  )
}
