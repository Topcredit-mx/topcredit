# Topcredit

## Todo

App Setup

- [x] Make it deploy (vercel)
  - [x] App builds locally
  - [x] Publish to github
  - [x] Connect/deploy to vercel
  - [x] vercel url works
  - [x] Setup biome w/autosave
- [-] Setup db (neon postgres w drizzle-orm) & next-auth
  - [x] Create neon dbs for dev preview and prod
  - [x] Setup drizzle-orm
  - [x] Initial schemas for users and accounts
  - [x] migrate db
  - [x] Setup next-auth w/ drizzle adapter
  - [x] Add env vars to vercel
  - [x] Setup credentials provider
  - [x] Basic login view
  - [x] Send OTP email (resend)
  - [x] Verify OTP code
  - [-] Cleanup code / Remove unused stuff
  - [ ] Landing home page
  - [ ] Users Layout (logout, nav) w/ auth guard (redirect to login if not auth)
  - [ ] Users home page (new users requesting credits)
- [ ] End to end tests (cypress)
- [ ] CI for cypress cloud
- [ ] Setup employee schema
  - [ ] Employee schema
  - [ ] Employee login (credentials provider)
- [ ] Employee layout (logout, nav) w/ auth guard (redirect to login if not auth)
  - [ ] Employee home page (list of credit requests)

Features

- pending

Final Touches (pre launch)

- [ ] Error management (w/ sentry)
