<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- App screens live under the pathless `_app` layout (client-only, redirects to /login without a session); shared data hooks are in `src/lib/data.ts` so every screen reads and writes through the same react-query keys.
- All app UI translations use the profile-language context and shared static catalog, including dialogs and tooltips; never translate or overwrite user-entered record values or customized labels.
- Spreadsheet imports parse Excel/CSV and bounded ZIPs in the browser, map only allowlisted business fields, and insert through shared mutations under existing RLS; never trust imported ownership IDs or overwrite existing rows.
- Personalization separates profile-backed theme/font from user-keyed browser palette storage; root data-palette applies semantic CSS tokens, while sales overrides tokens locally to remain independent of account choices.
- Profile photo uploads and existing-photo adjustments use react-easy-crop and export a 512px square before explicit save; opening or cancelling never writes the profile.
- CRM and client status glyphs share status-appearance defaults and personal profile preferences, including validated custom hex colors and percentages for every type; appearance changes never rewrite record stages.
- Editable status lists use immutable ids in profile preferences and a shared resolver across boards, pickers, indicators and dashboard; labels can change without rewriting stored records, and unknown existing stages remain visible.
- Every app table has a `user_id` (workspace owner, set by the assign_row_owner trigger so team inserts land in the owner's data) plus own-rows RLS and additive member policies via `member_role(owner, company, tab)` (viewer reads, editor writes, admin deletes); `created_by` records the author; the signup trigger gives rows with null `user_id` (imported backup) to the first account, so never leave test accounts holding them.
- Settings exports use shared filter and financial-summary helpers, prebuilt browser blobs and a paginated report renderer; this keeps formats consistent and preserves download activation on mobile.
- Client pickers use the shared ClientSelect inline registration and useCreateClient hook; new rows immediately enter the shared clients cache and remain selected without discarding the parent form.
- Tags are a shared `tags` table referenced by `tag_ids bigint[]` on clients, transactions, crm_leads and projects; keeps filtering to one query per screen.
- Team invites go through `inviteMember` (server fn, caller verified as owner/admin) so public signup can stay disabled.
- Subscriber billing: Stripe webhook (`/api/public/payments/webhook`) is the main writer of `subscriptions` (owner-only server functions in `src/lib/payments.functions.ts` also insert and update manual-access rows) and creates the subscriber login; access gating uses the pure `accessBlocked` rule in `src/lib/billing.ts` so the app gate, Assinantes tab and tests agree; owner-only screens check `has_role(admin)`.
- The public index is a sales page; product screenshots must contain no private records, shared billing constants supply its offer, and the checkout's validated `plano` search selects the advertised plan without changing payment logic.
- Capture sales screenshots from actual screens with browser-only intercepted fictional responses; never insert demonstration records into production, preserve full-image framing, and share a sales-only light/dark selection across ProductShowcase galleries without changing account appearance.
- PricingPlans owns the sales-page cycle selector and derives savings from shared billing constants, so displayed discounts and checkout links stay aligned with existing prices.
- The subscription page reuses PricingPlans and creates hosted Stripe Checkout with shared trial options; Stripe collects the canonical buyer email, and the verified subscription webhook provisions the same email in the app.
- Sidebar visibility is stored on the current user's profile; the editor includes hidden permitted tabs, while desktop and mobile navigation filter them, so restoring a tab never grants new permissions or removes records.
- Plan limits (companies, sócios, funcionários, Starter no-delete) are enforced by DB triggers using plan_tier(owner) from the latest subscription; Business keeps sistema_* price ids so old subscriptions remain valid.
- Sales and the app share the main origin: `/` serves sales, `/sistema` reuses the dashboard under the protected `_app` layout, and `/login` enters `/sistema`; keep origins and legacy hostname compatibility in `src/lib/site.ts` to preserve old links without weakening access checks.
- Sales cover videos use CDN asset pointers and CoverVideo with muted inline playback, pause/expand controls, and reduced-motion support, so demonstrations remain accessible without shipping video binaries.
- Feedback conversations are personal to the authenticated author, never inherited by workspace members; authenticated atomic RPCs own writes, RLS permits the author and platform user_roles admins only, and shared feedback query keys drive support and inbox views.
- Nexo Content availability uses the shared platform-admin rule in navigation, screen, and generation handler; company admin roles and missing subscriptions never unlock development access.
- RLS policies must decide workspace access through SECURITY DEFINER helpers (`member_role`, `company_role`, `client_files_*`), never by querying another RLS table inline: that subquery is itself filtered by the caller's policies, so it hides rows from outsiders and silently widens access instead of narrowing it.
