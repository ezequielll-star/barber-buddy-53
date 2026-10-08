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
- Public booking reads are scoped by shop slug and expose only active services, active barbers, and occupied times; why: clients never receive another client's personal data.
