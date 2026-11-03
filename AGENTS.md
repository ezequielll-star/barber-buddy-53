<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Barber panel routes live under `src/routes/_barbero/` and require an authenticated owner session; why: each owner only accesses their own shop data through RLS.
- Public booking reads go only through slug-scoped SECURITY DEFINER functions (`get_public_shop/services/barbers`); anon has no direct table access; why: visitors can't list shops or read owner ids or other clients' data.
- Shop access in RLS (`is_shop_owner`, barbershops policies) requires `is_active`; owners can't delete shops; why: a paused subscription must be blocked at the database, not only in the UI.
- Booking date rules (no past, max 60 days, active shop) are enforced in both `createBooking` and the `bookings` insert trigger, in Argentina time; why: every caller, including server code, is bound by them.
