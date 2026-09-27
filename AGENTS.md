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

- Barber panel routes live under `src/routes/_barbero/` gated by an encrypted-cookie PIN session (`src/lib/bookings.functions.ts`); why: keeps client data and cash private without user accounts.
- `bookings` table is server-only (RLS on, no policies); public page only receives occupied times via `getAvailability`; why: clients never see other clients' data.
