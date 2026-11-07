# Roadmap

- [x] Show the assigned barber and configured WhatsApp action after confirmation.
- [x] Require a barber choice before enabling booking dates and times.
- [x] Verify the public booking flow and current build status.- [x] Security stage 1: hide shop list, block paused shops and shop deletion in the database, reject past bookings.
- [x] Limit pending bookings per WhatsApp per shop (server + database).
- [x] Back up old PIN table to private backup schema.
- [x] Superadmin backend: roles table, admin DB functions, audit log, pause/reactivate — 34/34 security tests passed.
- [ ] Superadmin UI: /admin dashboard, shop detail (pause/reactivate), new shop, audit log; no payments, no deletion.
- [ ] Assign superadmin role to the owner's current account.
- [ ] Browser test: admin flow + owner blocked.
- [ ] Drop old PIN table (waiting on owner enabling backward-incompatible migrations).
- [ ] Delete unused BARBER_PIN and SESSION_SECRET keys (owner declined the deletion prompt; waiting on owner).
