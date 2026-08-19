# SariSync Phase 11 — Real-time price book sync

## Goal

When one active family account changes a price, the other signed-in devices in the same store reload the shared price book automatically. They do not need to refresh the browser page.

## What was added

- **Database publication** (`supabase_realtime`): Supabase is allowed to send changes from `products`, `price_updates`, and `categories` to subscribed browsers.
- **Shared browser service**: `src/js/services/realtime-service.js` opens one live subscription for the current store.
- **Screen refresh**: Home Price Pulse, Browse, Updates, category management, and open category selections refresh after a store change.
- **Sign-out cleanup**: the live subscription is closed before the Supabase session ends.

## Security rules that remain in force

- The browser uses the existing publishable key only. It never uses a service-role key.
- The listener first asks the protected `get_my_store_access` function for the signed-in person's store ID.
- Its table filters use that store ID. This prevents unnecessary events from other stores.
- Existing Supabase Row Level Security (RLS) remains the real permission check. A browser filter is helpful, but is not treated as permission by itself.

## Supabase procedure

1. In Supabase, open **SQL Editor**.
2. Run the SQL in `docs/phase-11-enable-realtime.sql` once.
3. Confirm the final result lists `categories`, `price_updates`, and `products`.
4. Do not disable RLS or add an `anon` policy for this feature.

## Browser procedure

1. Keep the normal local web server running at `http://127.0.0.1:5500`.
2. Open the app in two separate browser sessions. For example, use a normal window for Mom and an InPrivate/Incognito window for the second family member.
3. Log each person into a different SariSync account that belongs to **4YZ Mini Store**.
4. Keep both devices on Home, Browse, or Updates.

## Two-device test

1. On Device A, open **Browse** and edit `CARROTS 1 KILO`.
2. Change the retail price from `₱130` to `₱135`, then save.
3. On Device B, wait a moment. Do **not** refresh the page.
4. Expected result on Device B:
   - a small message says **“Price book updated by another device.”**
   - Browse shows `₱135`.
   - Home Price Pulse shows the newest Carrots change.
   - Updates shows the added history entry.

## If the test does not update

1. Confirm both accounts are active members of the same store in **Family Access**.
2. Confirm the three tables appear in the verification result from the SQL file.
3. Ensure both browser windows are signed in and online.
4. Open the browser console and look for `SariSync real-time connection status`.
5. Refresh only as a troubleshooting step; do not change the RLS policies to try to fix real-time.

## Complete when

Two family accounts in the same store see a saved price, product, or category change without manually refreshing. The next independent phase is offline caching and queued edits; it is not included here.
