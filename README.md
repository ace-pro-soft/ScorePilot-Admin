# ScorePilot Admin

The web panel for running ScorePilot. It talks only to the backend's `/admin/api`. Admins
have their own accounts and roles, and every change is written to an audit log. The panel
never calls the BestPreviews API itself.

Stack: React 18, TypeScript, Vite, Material UI, styled with the ScorePilot brand colours.

## What it does

| Page | For |
|---|---|
| Dashboard | Accounts, active Premium, crypto revenue (30 days and all time, per day, per method), invoice states, review queue, sync job and chain watcher health |
| Users | Search accounts; on one account: devices, follows, Premium periods, payments and admin history. Give Premium days (compensation or trial), revoke a period, disable or enable the account |
| Payments | Every crypto invoice, filtered by status or chain, searchable by email, transaction hash or id. Credit or reject payments in review (a note is required) |
| Transfers | Incoming transfers the chain watchers saw. Assign an unmatched transfer to an invoice, or ignore it |
| Plans & methods | Plan names, lengths and USD prices; switch each token/network on or off; confirmation counts; which receiving addresses are configured |
| Picks | Today's model picks; pin the Pick of the Day |
| Leagues | Rename, set tier, hide or reorder leagues |
| App settings | When free users see picks, the guest follow limit, the Pick of the Day odds band, the minimum app version, an in-app banner, and a switch that pauses checkout |
| Sync & cache | Run any sync job now, see cache usage, purge by key prefix, check the chain watchers |
| Admins | Add admins, change roles, disable access (owners only) |
| Audit log | Who changed what, with before/after details |
| Account | Change your password; turn on two-factor sign-in (authenticator app, QR code) |

Roles:

| Role | Can do |
|---|---|
| owner | Everything |
| ops | Sync and cache, settings, leagues, picks, plans and methods |
| support | Users, Premium grants, payments and transfers |
| editor | Leagues, Pick of the Day, app settings |
| viewer | Read only |

## Run in development

You need the backend running (see `ScorePilot-Backend/README.md`) and an owner account:

```
cd ScorePilot-Backend
go run ./cmd/admin create -email you@example.com -role owner        # prints a generated password
```

Then start the panel:

```
cd ScorePilot-Admin
npm install
npm run dev            # http://localhost:5173/admin/
```

Vite forwards `/admin/api` to `http://127.0.0.1:8080`. To use another backend, set
`SCOREPILOT_API=http://host:8080` before `npm run dev`.

## Build and deploy

```
npm run build          # type-checks, then writes dist/
```

The backend can serve the panel itself. Set `ADMIN_UI_DIR=/path/to/ScorePilot-Admin/dist` and the
panel is available at `https://<api host>/admin` on the same origin as the API, so no CORS setup
is needed. You can also host `dist/` on any static host, as long as it forwards `/admin/api` to the
backend.

Security notes:

- Turn on two-factor for every admin, from Account in the panel.
- Sign-in is rate-limited per IP. Tokens last 12 hours. Disabling an admin or changing their role
  applies to their next request.
- If an owner is locked out, reset them from the server with
  `go run ./cmd/admin reset -email you@example.com`. This sets a new password and turns
  two-factor off.
- Serve the panel only over HTTPS. Consider restricting `/admin` by IP at the reverse proxy.

The screens follow `ScorePilot-Backend/docs/application-flow.md` section 4. The payment
operations are described in `docs/crypto-billing.md`.
