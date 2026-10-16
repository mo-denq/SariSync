# Refresh and live-update reliability

## Implemented locally

- Home's timer-based Sync action is now a real **Refresh** button. Settings has the same read-only action. Neither claims that every family phone is up to date.
- `src/js/services/refresh-service.js` coordinates reads, disables the Home button while loading, shares repeated clicks, and performs a trailing reload if a save/live event arrives during an older read. Reads time out after 20 seconds; late results are not applied.
- Returning to the visible app, restoring a page, and reconnecting to the internet trigger a refresh and check the live listener. Closely grouped return events are combined. No swipe gesture was added.
- `realtime-service.js` reuses healthy connections, replaces failed ones, retries channel failures with a capped delay, and fetches missed changes after subscription succeeds. The existing store filter and protected data functions remain unchanged.
- `product-form.js` and `product-repository.js` put accepted saves into the device's product list using the server's product ID. The subsequent read updates categories and price history. A failed read after a successful write is reported as saved-but-not-refreshed, not a failed save that invites duplicate submission.
- `home.js` refreshes hidden Home cards and visible lists without navigating away. Open forms and confirmation dialogs are not rebuilt; their category selection and typed values stay intact. Browse search text is preserved. Price Lookup refreshes an active product in place.
- Pending offline values remain overlaid on fetched products. Manual Refresh does not upload edits. The previously implemented automatic offline queue still runs after reconnection; conflict resolution remains separate work.
- `auth-session.js` cancels pending refresh application at sign-out. `index.html` loads the new module and revised file versions.

Existing unrelated `output/` and `tmp/` files were left alone. No database changes, production writes for testing, commit, push, or deployment were performed.

## Test before publishing to the whole family

1. Add a clearly identified test product on device A. After successful Save, find it in Home/Browse without closing the app. Edit its price and repeat.
2. On device B in the same store, keep Browse open. Save a different product on A. B should receive it automatically. Tap Refresh if needed; it must load real data, not just display a success timer.
3. On B, type unsaved changes into an Edit form. Save a different product on A, then switch B away and back. B must stay in Edit with all its text, prices and selected category unchanged.
4. Put B in the background. Save on A. Return to B: it should reload visible data and re-establish the live listener if necessary.
5. Tap Home Refresh repeatedly on a slow connection. The button should read “Refreshing…” and avoid parallel reads. On success, expect “Price book updated.” A partial history failure must say history could not refresh.
6. Turn off internet and press Refresh. Keep the currently displayed products; show offline feedback. Restore internet and retry. Never show a false “all devices synced” message.
7. Test an existing queued offline edit, reconnect, and check it remains visible until uploaded successfully. A manual read must not discard it or upload it by itself.
8. Sign out while a read is pending. No late result should update the signed-out page.
9. Repeat in the installed phone app and browser. Check the longer loading/error labels fit the screen.

## Limits and remaining work

Automated tests simulate browser events and network responses. They do not verify the physical phones, deployed assets, or live database publication/RLS configuration. If live changes still do not arrive, inspect channel errors and verify that products, categories and price_updates are enabled in the existing Realtime publication; ask before any database change.

This refresh controller belongs to the main app shell. The separate category HTML page still uses Home's saved product list; it is not an independently live-subscribed page. Returning to Home reloads the main price book.

This work does not introduce same-product conflict protection, a pending-edits management screen, or reliable offline cold startup. Preserve those as separate tasks. Two simultaneous edits of the same product require a future server-checked conflict safeguard.

Supabase guidance was used to preserve store authorization and use the documented subscription/removal lifecycle; no new database authority was introduced. References: [subscribe](https://supabase.com/docs/reference/javascript/subscribe), [removeChannel](https://supabase.com/docs/reference/javascript/removechannel).
