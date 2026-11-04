# Roadmap

- [x] Show the assigned barber and configured WhatsApp action after confirmation.
- [x] Require a barber choice before enabling booking dates and times.
- [x] Verify the public booking flow and current build status.- [x] Security stage 1: hide shop list, block paused shops and shop deletion in the database, reject past bookings.
- [x] Limit pending bookings per WhatsApp per shop (server + database).
- [x] Back up old PIN table to private backup schema.
- [ ] Drop old PIN table (waiting on owner enabling backward-incompatible migrations).
- [ ] Delete unused BARBER_PIN and SESSION_SECRET keys (owner declined the deletion prompt; waiting on owner).
