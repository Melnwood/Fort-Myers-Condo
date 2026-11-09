# Guest Guide (Touch Stay replacement)

Live: https://fort-myers-guest-guide.netlify.app  ·  Content: Airtable base **Guest Guides** (appKbpAux0kjZHHR9)

## How it works
- **Airtable is the editor.** `Properties` = one row per rental (name, address, cover, guest code). `Topics` = every card in the guide. Tick **Published** to show, **Private** to hide behind the guest code. `Notes for Host` never reaches guests.
- **Netlify function** `/api/guide?p=<slug>` reads Airtable with a server-side token and strips private topics unless the guest code matches.
- **index.html** is a single-file mobile web app (add-to-home-screen, works offline from last load).
- Guest link: `https://fort-myers-guest-guide.netlify.app/?p=fort-myers` — or pre-unlocked: `…/?p=fort-myers&code=<GuestCode>` (code is stored on the device and removed from the URL).
- Second property: add a row in Properties with a new Slug, link its Topics. No code change.

## Setup (one-time)
1. Airtable → Developer hub → Personal access token: scope `data.records:read`, access = **Guest Guides** base only.
2. Netlify → fort-myers-guest-guide → Environment variables → add `AIRTABLE_TOKEN` (secret, Functions scope). `AIRTABLE_BASE_ID` and `DEFAULT_PROPERTY` are already set.
3. Redeploy (env vars are frozen per deploy).

## What breaks it / who fixes it
| Breaks | Symptom | Fix |
|---|---|---|
| Airtable token expired/revoked | "Could not load the guide" | New read-only token → Netlify env → redeploy (Mel or Noah) |
| Base/table/field renamed | Blank or 502 | Keep names: Properties, Topics, Slug, Active, Published, Private, Order, Title, Section, Body, Photos, Video URL, Property |
| Videos removed from Touch Stay's Vimeo after cancelling | Black video boxes | Re-upload originals to your own YouTube (unlisted) / Vimeo, paste link in Video URL |
| Airtable free-plan limits | Attachments stop uploading | Check plan limits in Airtable |
| Guest code shared too widely | Past guests can see codes | Change Guest Code in Airtable (instant) — and rotate door/garage codes |

## Data protection
Holds no guest personal data: no accounts, no analytics, no booking info. Only property content + one shared code. Sub-processors: Airtable (content), Netlify (hosting), Vimeo/YouTube (video embeds load from their servers). Door/garage/WiFi codes are only sent after the code check.
