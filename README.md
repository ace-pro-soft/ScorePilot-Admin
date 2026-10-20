# ScorePilot Admin

Web admin panel for operating the ScorePilot backend: upstream sync health, cache, remote config
(free / premium knobs), Pick of the Day, league catalogue, users and subscriptions, push campaigns,
content and moderation, analytics, audit log.

It talks only to the backend's `/admin/*` API with role-based admin accounts. It never calls the
BestPreviews API directly.

Design and screen list: see `ScorePilot-Backend/docs/application-flow.md`, section "Admin panel".
