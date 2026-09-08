# Four usability improvements

## Changes and files

| Area | Files | Behavior |
| --- | --- | --- |
| Search results | `src/js/components/product-card.js`, `src/js/pages/category.js`, `src/css/components.css` | Home, Browse, and category results show the full product name, category, and retail price. Shared text is escaped and long names wrap. |
| Permissions | `src/js/pages/settings.js`, `category-management.js`, `archived-products.js`, `edit-product.js`, `src/js/services/csv-service.js` | Member restrictions have explanations. Direct owner-page attempts get a readable message. Members retain product editing. Server-side checks remain authoritative. |
| Barcode recovery | `src/js/services/barcode.js`, `src/js/pages/home.js`, `product-details.js` | Scan-originated lookup offers “Wrong item? Search by name.” It clears the search, not saved product data. Ordinary lookups do not show it. |
| Quick guide | New `src/js/components/quick-guide.js`, Settings and Home integration | One compact native modal explains Search, Scan, Edit, Save. Skip, Got it, and Escape dismiss it. Settings reopens it. |
| Loading and styling | `index.html`, `pages/categories/category.html`, `src/css/styles.css` | Load the shared components and revised assets. |
| Automated checks | New `tests/usability.test.js` | Guide preferences, busy-state suppression, consistent labels, scan recovery, owner/member messaging. |

No new folders, SQL functions, policies, schema changes, commits, or deployments were needed. Earlier uncommitted mobile-feedback changes are preserved.

## Product size/unit boundary

The legacy product model lists `unit`, but the current real-product loader and checked-in SQL do not supply separate saved size/unit values. Therefore this implementation uses the complete saved name (for example VINEGAR 100ML). It does not invent, parse, or save sizes, and does not duplicate 100ML. Adding structured size/unit fields later requires a separate approved data change.

## Guide preference and timing

The storage key is `sarisync:quick-guide:v1:<signed-in-user-id>` and contains only `dismissed`. Both buttons suppress automatic repetition for that account on this browser. The preference remains after sign-out; accounts are separate. Cleared browser storage or another device/browser can show it again. If storage is unavailable, dismissal works for this visit and a message explains that it could not be remembered.

Automatic display is attempted only after successful online authentication, product/history loading, and offline recovery. It is skipped when pending edits remain, an error occurs, another view/form/dialog is open, or scanning is active. A skipped automatic attempt is not marked completed; users can use Settings or see it on a later clean launch. Offline-only launch does not force the guide.

The native dialog blocks background interaction and contains keyboard focus. Dismissal restores focus when the prior element still exists. Browsers without native dialog support receive a short text explanation instead. There is no guided animation to slow down navigation.

## Manual checklist

1. Search for similar products with different sizes. Check Home, Browse and category results show full names, categories and prices once. Test long names, missing units and no results.
2. As owner, open categories, imports, archive and restore. Existing actions should remain usable.
3. As member, check Settings explains disabled category/import actions. Open owner pages directly through existing app entry points: expect an explanation rather than editable controls. Edit a product price: it should remain permitted. A rejected server action should show feedback.
4. Scan a known barcode from Home. Use “Wrong item? Search by name.” Confirm Home search is empty, visible and focused; search for the correct product. No barcode should be edited automatically.
5. Open a product normally: no mismatch action. Scan an unknown barcode: keep existing no-match guidance. Scan into Add/Edit: fill the barcode field without navigating away.
6. On a fresh browser/account, load online with no pending changes. Read the guide; choose Skip. Reload: it must not repeat. Reopen through Settings. Repeat with Got it and with Escape. Sign into a different account and check its independent preference.
7. Open while recovering queued edits or with an active scanner/form: no guide should interrupt. After recovery, use Settings to open it.
8. At 320–390px screen widths and larger text, check long product names, price alignment, guide scrolling and both guide buttons. Use Tab/Shift+Tab and Escape; background controls must be unavailable during the modal.
9. Enable reduced motion and repeat scanning/recovery. Confirm existing scan animation is skipped and search recovery does not animate scrolling.

## Verification boundary

Automated checks use simulated browser objects. They do not prove physical iPhone/Android camera behavior, visual layout, or live database permissions. No production data was changed or live security audit performed. The Supabase skill was consulted to keep display restrictions separate from database authorization; protected functions/RLS were not modified.
