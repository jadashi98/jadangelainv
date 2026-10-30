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

## Architecture rules
- Site content lives in a single `site_settings` row (jsonb `data` + `hero_image_url` storage path); public reads it, only admins write. Why: everything editable without code.
- Admin = row in `user_roles`; the first auth user ever created is auto-assigned admin by trigger. Why: one private organizer account without a public admin signup.
- Uploaded site media go to the private `site-media` bucket and are shown via signed URLs (public buckets are blocked in this workspace).
- UI strings live in `src/lib/i18n.tsx` (en/es/ar); admin pages force `dir="ltr"`.
