# Admin panel guide

The panel shows data and controls only. This page explains what each page does and what
its actions change. Every change an admin makes is written to the **Audit log**.

## Dashboard

Accounts, Premium, crypto revenue and system health at a glance.

- **Checkout is paused**: shown while checkout is switched off in App settings. Users
  can't start new payments.
- **Payments waiting for review / unmatched transfers**: open the review queue with
  **Review**.
- **Chain watchers** only read the blockchains while invoices are open.

## Users

Accounts created with the email code. Guests (devices that never signed in) are not
listed. Filter by plan: Premium, in trial, trial ended (never paid), free, disabled.

On an account:

- **Devices**: name, system, app version, online status, IP, ids, and the installation:
  `Installed <date> on v<version> · from <source>` as the app reported it, or `First seen
  <date>` when the app hasn't reported its install time.
- **Give Premium days**: the days are added after the current Premium end date, if any.
  A note is required and kept in the audit log.
- **Revoke** a Premium period: later periods move up to fill the gap. Refunds for crypto
  payments are sent from the wallet by hand.
- **Disable account**: the user is signed out everywhere and can't sign in until the
  account is enabled again. **Enable account** undoes it.
- **Ban from posting** (community): they can still sign in and read chats, but can't send
  messages, react or create groups. **Allow posting** undoes it.

## Payments

Crypto invoices, filtered by status or chain, searchable by email, transaction hash or id.
Payments **in review** need a decision:

- **Credit**: marks the invoice paid and grants its plan. Only do this after checking the
  transfer on the explorer.
- **Reject**: closes the invoice without granting Premium. If money arrived, refund it
  from the wallet and say so in the note.
- "The claimed transaction does not match the invoice exactly": the payer claimed a
  transaction whose token, network or amount differs. Check it on the explorer, then
  credit or reject.

## Transfers

Everything the chain watchers saw arriving at the receiving addresses. **Unmatched**
transfers did not fit any open invoice.

- **Assign**: credits an invoice with the transfer and grants its plan. Find the invoice id
  under Payments (search by the user's email). The invoice must use the same token and
  network as the transfer.
- **Ignore**: marks the transfer as handled without crediting anything.

## Plans & payment methods

Plan names, lengths and USD prices; each token/network on or off; confirmation counts.
Prices are in USD and converted at checkout; open invoices keep the price they were
created with.

"N method(s) have no receiving address": set `PAY_ADDRESS_EVM`, `PAY_ADDRESS_TRON`,
`PAY_ADDRESS_SOLANA` or `PAY_ADDRESS_BITCOIN` in the backend `.env` to offer them.

## Picks

Today's model picks (dates in UTC) and how many are published for the next three days.
**Pin** a pick as the Pick of the Day. When none is pinned, the backend chooses one on the
first request of the day: picks inside the odds band set in App settings first, then top
leagues, then the larger edge.

## Leagues

The catalogue used for grouping, filters and Pick of the Day: rename, set tier, hide or
reorder. New leagues are added automatically as fixtures arrive. The league id is what the
Community page asks for to show a league logo.

## Community

Reports from the app, the official communities and posting bans. Private groups and direct
chats are only visible through the messages people report.

- **Delete**: the message disappears for everyone; the sender is not banned.
- **Delete and ban**: the message disappears and the sender can no longer post (they can
  still read). Lift the ban on their user page.
- **Community admins** show an "Admin" label in the chat and can pin and delete messages in
  that community. The person needs a community profile; they join the community if they
  haven't.

## App settings

Applied immediately to every app through `/v1/config` and the API. The header shows the
last change and who made it.

| Setting | Meaning |
|---|---|
| When free users see a pick | On match day (00:00 UTC), after kickoff, or always. Premium always sees picks as soon as they are published. |
| Teams a guest can follow | Limit for devices that aren't signed in. Signed-in accounts can follow any number. |
| Free trial for new accounts (days) | A new account gets Premium for this many days, then Premium features lock until it pays. One trial per device. Applies to sign-ups from the moment it is saved. `0` turns it off. |
| Pick of the Day min / max odds | The odds band the automatic Pick of the Day prefers. |
| Minimum app version | Android apps below it are told their update is required. |
| In-app banner | Up to 280 characters shown in the apps; empty for none. |
| Checkout | Pausing stops new invoices (for wallet maintenance or an incident). Payments already on their way are still detected and credited. |

Roles that can't change settings see the fields disabled.

## App releases

The files the Android app and the desktop app install and update from. Full details,
including what the apps send: `XWillWin-Backend/docs/app-updates.md`.

- **Upload**: a signed release APK, or a desktop file exactly as the build names it
  (`XWillWin-1.2.3-win-x64.zip`, `XWillWin-1.2.3-win-x64-setup.exe`, `…-linux-x64.AppImage`,
  `…-osx-arm64.dmg`, `…-osx-x64.dmg`). The version must be higher than every earlier release
  for that platform; the server reads the platform and version from the file. APKs must be
  signed with the app's key; set `RELEASE_CERT_SHA256` on the backend to pin it. Uploads
  start as drafts offered to everyone.
- **Storage**: the header shows where files go. With Cloudflare R2 configured on the backend,
  the server checks each upload and then stores it in the R2 bucket (` · R2` under the size);
  downloads redirect to R2. Deleting a release deletes its file from R2.
- **Windows installer** (`…-win-x64-setup.exe`): the program for first installs. Make it the
  base and the website's Windows button downloads it. It is never offered as an update and
  has no audience; Windows apps update from the zip.
- **What's new**: shown in the app's update sheet, one change per line.
- **Required**: the app's update bar can't be closed until the user updates. The app is
  never blocked.
- **Audience** (who sees the release in their update bar):
  - *Everyone*.
  - *Chosen users*: search by email. The release reaches these accounts on every device
    they are signed in on.
  - *Devices installed in a date range*: "on or after" and "before" dates, either may be
    empty. Dates are midnight in your time zone. Install time is what the app reports
    (Android's first install time, the desktop app's first run); apps that don't report it
    count from when the server first saw them.

  The box at the bottom counts, among devices that have reported: how many are in the
  audience, how many of them run an older version (they will see the update), how many
  accounts, and which versions they run. Each app is offered the newest published release
  whose audience includes it.
- **Make base / Unset base**: the base release is the website download for its platform
  (the header shows it). New installs start there and are then offered what their
  audience allows. Without a base, the website hands out the newest release offered to
  everyone. Only published releases can be the base; withdrawing unsets it.
- **On it now**: devices that last reported that version.
- **Withdraw** stops offering a release; devices that installed it keep it. **Delete** works
  on drafts and withdrawn releases.
- The audience is not access control: anyone with the file link can download a published
  file.
- Desktop installers aren't code-signed yet, so Windows and macOS warn people who download
  them by hand; updates from inside the app don't show that warning.

## Sync & cache

Upstream polling jobs, the in-process cache and the chain watchers. **Run** starts a sync
job now. **Purge** clears cache keys starting with the prefix; an empty prefix clears
everything, and data is fetched again on demand.

## Admins

People who can sign in to this panel. Only owners can add or change admins. New admins get
an initial password (at least 10 characters); ask them to change it and turn on two-factor.

| Role | Can do |
|---|---|
| owner | Everything, including admins and prices |
| ops | Sync and cache, settings, leagues, picks, plans and methods, app releases |
| support | Users, Premium grants, payments and transfers |
| editor | Leagues, Pick of the Day and app settings |
| viewer | Read only |

## Audit log

Every admin change, newest first, with who made it and the details.

## Account

Change your password (at least 10 characters). **Two-factor sign-in**: turn it on, since
admin accounts can credit payments and grant Premium. Scan the QR code with Google
Authenticator, 1Password, Authy or similar (or type the key), then enter the 6-digit code.
After that, sign-in asks for a code from the authenticator app. Turning it off needs your
password.
