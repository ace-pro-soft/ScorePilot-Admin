import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Alert, Box, Button, Card, CardContent, Chip, Grid, Stack, TextField, Typography } from '@mui/material'
import { post } from '../api'
import { useAuth } from '../auth'
import { Mono, PageHeader, useAction } from '../components/common'

export default function Account() {
  const { admin, refresh } = useAuth()
  const { run, busy } = useAction()
  const [pw, setPw] = useState({ current: '', next: '', again: '' })
  const [setup, setSetup] = useState<{ secret: string; otpauth_url: string } | null>(null)
  const [qr, setQr] = useState('')
  const [code, setCode] = useState('')
  const [disablePw, setDisablePw] = useState('')

  useEffect(() => {
    if (setup) QRCode.toDataURL(setup.otpauth_url, { width: 220, margin: 1 }).then(setQr)
  }, [setup])

  return (
    <>
      <PageHeader title="Account" subtitle={`${admin?.email} · ${admin?.role}`} />
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Password</Typography>
              <Stack spacing={2}>
                <TextField type="password" label="Current password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" />
                <TextField type="password" label="New password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} helperText="At least 10 characters." autoComplete="new-password" />
                <TextField type="password" label="New password again" value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} error={!!pw.again && pw.again !== pw.next} autoComplete="new-password" />
                <Button variant="contained" disabled={busy || !pw.current || pw.next.length < 10 || pw.next !== pw.again}
                  onClick={() => run(() => post('/me/password', { current: pw.current, new: pw.next }), 'Password changed').then((ok) => ok && setPw({ current: '', next: '', again: '' }))}>
                  Change password
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6">Two-factor sign-in</Typography>
                <Chip size="small" label={admin?.totp_enabled ? 'on' : 'off'} color={admin?.totp_enabled ? 'success' : 'default'} />
              </Stack>
              {admin?.totp_enabled ? (
                <Stack spacing={2}>
                  <Typography color="text.secondary">Sign-in asks for a code from your authenticator app.</Typography>
                  <TextField type="password" label="Password to turn it off" value={disablePw} onChange={(e) => setDisablePw(e.target.value)} />
                  <Button color="error" variant="outlined" disabled={busy || !disablePw}
                    onClick={() => run(() => post('/me/totp/disable', { password: disablePw }), 'Two-factor turned off').then((ok) => { if (ok) { setDisablePw(''); refresh() } })}>
                    Turn off
                  </Button>
                </Stack>
              ) : !setup ? (
                <Stack spacing={2}>
                  <Alert severity="warning">Turn this on: admin accounts can credit payments and grant Premium.</Alert>
                  <Button variant="contained" disabled={busy} onClick={async () => { try { setSetup(await post('/me/totp/setup')) } catch { /* toast via useAction not needed */ } }}>
                    Set up with an authenticator app
                  </Button>
                </Stack>
              ) : (
                <Stack spacing={2}>
                  <Typography color="text.secondary">Scan the code with Google Authenticator, 1Password, Authy or similar, then enter the 6-digit code.</Typography>
                  {qr && <Box component="img" src={qr} alt="Authenticator QR code" sx={{ width: 220, height: 220, alignSelf: 'center' }} />}
                  <Typography variant="body2">Or enter this key: <Mono>{setup.secret}</Mono></Typography>
                  <TextField label="Code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputProps={{ inputMode: 'numeric' }} />
                  <Button variant="contained" disabled={busy || code.length !== 6}
                    onClick={() => run(() => post('/me/totp/enable', { code }), 'Two-factor is on').then((ok) => { if (ok) { setSetup(null); setCode(''); refresh() } })}>
                    Turn on
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  )
}
