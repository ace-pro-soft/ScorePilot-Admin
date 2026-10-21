import { useEffect, useState } from 'react'
import {
  Alert, Button, Card, CardContent, FormControlLabel, Grid, MenuItem, Stack, Switch, TextField, Typography,
} from '@mui/material'
import { get, put } from '../api'
import { useAuth } from '../auth'
import { ErrorBox, Loading, PageHeader, useAction, useLoad, when } from '../components/common'

type Knobs = {
  free_pick_visibility: string
  guest_favourite_limit: number
  pick_of_day_min_odds: number
  pick_of_day_max_odds: number
  min_app_version: string
  banner: string
  checkout_enabled: boolean
}

export default function Settings() {
  const { can } = useAuth()
  const writable = can('content.write')
  const { run, busy } = useAction()
  const { data, error, loading, reload } = useLoad(() => get<{ settings: Knobs; updated_at?: string; updated_by?: string }>('/settings'))
  const [k, setK] = useState<Knobs | null>(null)
  useEffect(() => { if (data) setK(data.settings) }, [data])
  if ((loading && !data) || !k) return error ? <ErrorBox error={error} onRetry={reload} /> : <Loading />
  const set = <K extends keyof Knobs>(key: K, v: Knobs[K]) => setK({ ...k, [key]: v })
  const dirty = JSON.stringify(k) !== JSON.stringify(data?.settings)

  return (
    <>
      <PageHeader title="App settings" subtitle={`Applied immediately to every app through /v1/config and the API. Last change ${when(data?.updated_at)}${data?.updated_by ? ` by ${data.updated_by}` : ''}.`}
        actions={writable && <Button variant="contained" disabled={!dirty || busy} onClick={() => run(() => put('/settings', k), 'Settings saved').then((ok) => { if (ok) reload() })}>Save changes</Button>} />
      {!writable && <Alert severity="info" sx={{ mb: 2 }}>Your role can view settings but not change them.</Alert>}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Free vs Premium</Typography>
              <Stack spacing={2}>
                <TextField select label="When free users see a pick" value={k.free_pick_visibility} disabled={!writable}
                  onChange={(e) => set('free_pick_visibility', e.target.value)}
                  helperText="Premium always sees picks as soon as they are published.">
                  <MenuItem value="match_day">On match day (00:00 UTC)</MenuItem>
                  <MenuItem value="after_kickoff">After kickoff</MenuItem>
                  <MenuItem value="always">Always (no early-access advantage)</MenuItem>
                </TextField>
                <TextField type="number" label="Teams a guest can follow" value={k.guest_favourite_limit} disabled={!writable}
                  onChange={(e) => set('guest_favourite_limit', Number(e.target.value))} helperText="Signed-in accounts can follow any number." />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Pick of the Day</Typography>
              <Stack direction="row" spacing={2}>
                <TextField type="number" label="Min odds" value={k.pick_of_day_min_odds} disabled={!writable} inputProps={{ step: 0.05 }}
                  onChange={(e) => set('pick_of_day_min_odds', Number(e.target.value))} />
                <TextField type="number" label="Max odds" value={k.pick_of_day_max_odds} disabled={!writable} inputProps={{ step: 0.05 }}
                  onChange={(e) => set('pick_of_day_max_odds', Number(e.target.value))} />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                The automatic choice prefers picks in this odds band, then top leagues, then the larger edge.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>App</Typography>
              <Stack spacing={2}>
                <TextField label="Minimum app version" value={k.min_app_version} disabled={!writable}
                  onChange={(e) => set('min_app_version', e.target.value)} helperText="Older apps are asked to update." />
                <TextField label="In-app banner" value={k.banner} disabled={!writable} multiline minRows={2} inputProps={{ maxLength: 280 }}
                  onChange={(e) => set('banner', e.target.value)} helperText={`${k.banner.length}/280 · leave empty for none`} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Payments</Typography>
              <FormControlLabel control={<Switch checked={k.checkout_enabled} disabled={!writable} onChange={(e) => set('checkout_enabled', e.target.checked)} />}
                label={k.checkout_enabled ? 'Checkout is open' : 'Checkout is paused'} />
              <Typography variant="body2" color="text.secondary">
                Pausing stops new invoices (for wallet maintenance or an incident). Payments already on their way are still detected and credited.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  )
}
