# SariSync Version 1 Screen Inventory

This inventory defines the purpose, entry point, next destinations, and back behavior for every Version 1 screen.

## Navigation rules

- Home is the main daily-use screen.
- Home keeps the branded header and shared bottom navigation.
- Secondary screens use the shared app shell without repeating the branded Home header.
- The back arrow returns to the screen that opened the current screen.
- Saving a successful product change returns to the relevant product/list context and refreshes Price Pulse.
- Tapping a bottom-navigation tab is treated as a destination change, not as a browser-history action.

## Screen inventory

| Screen | Purpose | Where the user enters | Where the user can go next | Back button behavior |
|---|---|---|---|---|
| **Login** | Sign in to an existing SariSync store account. | App launch, signed-out session, or expired session. | Home after successful sign-in; Register Store; Join Store. | Back exits the authentication flow or closes the page if the platform supports it. |
| **Register Store** | Create a new store account and owner profile. | Login → Create/Register Store. | Device Setup after registration; Login if cancelled. | Returns to Login without creating the account. |
| **Join Store** | Let a family member join an existing store using its store code. | Login → Join Existing Store. | Device Setup after a valid store code; Login if cancelled. | Returns to Login without joining the store. |
| **Device Setup** | Record the device user’s nickname, such as Mom, Dad, or Caleb. | After Register Store or Join Store. | Home after successful setup; previous account step if details need correction. | Returns to the previous registration or join step. |
| **Home** | Daily dashboard for fast lookup, barcode scanning, Price Pulse, quick actions, and category preview. | Successful login/setup; bottom navigation Home; app launch with an active session. | Product Lookup; Update Price; Add Product; Browse; Updates; Settings; Category Products. | No page back button is required. The Home tab is the root destination. |
| **Browse** | Browse the complete price book, filter by category, and choose products to edit. | Bottom navigation Browse; Home → Categories → View All. | Category Products; Edit Item Details; Product Lookup; Home through bottom navigation. | Returns to the previous screen, normally Home. |
| **Updates** | Show recent price changes, updater names, timestamps, and price differences. | Bottom navigation Updates; Home → Price Pulse → View All. | Product Lookup; Edit Item Details; Home through bottom navigation. | Returns to the previous screen, normally Home. |
| **Settings** | Manage store controls, profile access, import/export, device access, categories, and sync settings. | Bottom navigation Settings. | Profile; Import Price List; Export Backup; Category Management; Home through bottom navigation. | Returns to the previous screen, normally Home. |
| **Profile** | View and edit the signed-in person’s name, mobile number, email, photo, and device nickname. | Home avatar; Settings → Manage Profile. | Settings when opened from Settings; Home when opened from the Home avatar. | Returns to the screen that opened Profile. |
| **Product Lookup** | Display a product’s current retail price, optional wholesale price, cost, bottle deposit, notes, barcode, and last update. | Home search result; barcode match; Price Pulse card; Browse product selection. | Edit Item Details; previous list or Home. | Returns to the screen that opened the product lookup. |
| **Update Price** | Help the user find an existing product before editing its price. | Home → Update Price quick action. | Edit Item Details after selecting a product; Home if cancelled. | Returns to Home or the previous product list. |
| **Edit Item Details** | Edit an existing product’s name, category, prices, barcode, bottle deposit, notes, and photo. | Update Price → Select Product; Browse → Select Product; Product Lookup → Edit. | Product Lookup or Browse after save; Price Pulse refreshes after a price change. | Discards unsaved changes and returns to the screen that opened the editor. |
| **Add Product** | Create a new product record for the shared price book. | Home → Add Product quick action; floating Add button; empty-state Update Price action. | Home or Browse after a successful save; barcode scanner while entering the product. | Discards unsaved fields and returns to the previous screen. |
| **Import Price List** | Prepare and validate a CSV price list before adding products to the store book. | Settings → Store Management → Import Price List. | Validation result; corrected import; Settings after cancel or completion. | Cancels the import and returns to Settings without changing products. |
| **Export Backup** | Generate and download a CSV backup of the current price book. | Settings → Store Management → Export Backup. | Download confirmation; Settings. | Returns to Settings without changing product data. |
| **Category Products** | Show products belonging to one selected category and let the user search within that category. | Home category card; Browse category filter. | Product Lookup; Edit Item Details; Browse or Home. | Returns to Browse when entered from Browse, or Home when entered from a Home category card. |

## Important decisions to preserve during implementation

### Product Lookup versus Edit Item Details

Product Lookup is for reading price information. Edit Item Details is for changing information. A user should not accidentally edit a price just by looking up a product.

### Update Price versus Add Product

Update Price starts with an existing product search. Add Product starts with an empty product form. They should remain separate flows so users do not accidentally create duplicates when they intended to update an item.

### Back behavior

Back should preserve the user’s context whenever possible. For example, returning from Category Products should restore the selected category, and returning from Edit Item Details should return to the product or list that opened it.

### Bottom navigation

Home, Browse, Updates, and Settings are top-level destinations. Selecting one of these tabs should switch the shared app view and should not create duplicate navigation bars or nested app shells.

## Completion checklist

- [ ] Every screen has a clear purpose.
- [ ] Every screen has at least one valid entry path.
- [ ] Every screen has a documented next destination.
- [ ] Every secondary screen has a back behavior.
- [ ] Save, cancel, empty, validation, and offline states are documented for applicable screens.
- [ ] The inventory matches the Version 1 user-flow diagrams.
- [ ] Any future screen is added here before implementation.
