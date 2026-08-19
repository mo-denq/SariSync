# FILE: ARCHITECTURE.md | FOLDER: project root

# SariSync Phase 5 Web Architecture

## 1. Final status

**Phase 5 status: Completed**

SariSync now has a clear web-prototype structure built with HTML, CSS, and
JavaScript. The existing interface, mock product data, and business rules were
preserved. The shared application shell remains responsible for the bottom
navigation and the main in-app page area.

One confirmed navigation problem was fixed during the final review: the Edit
Item Back button now returns to the screen that opened it. For example, an edit
started from Update Price returns to Update Price, while an edit started from
Product Details returns to Product Details.

## 2. Completed structure

```text
index.html                         # Shared app shell and Home markup
settings.html                      # Compatibility redirect to Settings
pages
|-- auth
|   `-- login.html                 # Sign-in and store-registration document
`-- categories
    `-- category.html              # Standalone reusable category document
src
|-- css
|   |-- styles.css                 # Loads all CSS layers in order
|   |-- tokens.css                 # Colors, spacing, radius, and type values
|   |-- base.css                   # Browser defaults and basic typography
|   |-- layout.css                 # App shell and page layout foundations
|   |-- components.css             # Components and responsive page rules
|   `-- pages                      # Reserved for future page-only styles
|-- js
|   |-- navigation.js              # Shared tabs, active view, and Back buttons
|   |-- pages
|   |   |-- home.js                # Home coordination and shared view routing
|   |   |-- browse.js              # Product browsing and category filtering
|   |   |-- updates.js             # Complete price-change list
|   |   |-- settings.js            # Store and account controls
|   |   |-- profile.js             # Current member profile
|   |   |-- product-details.js     # Price lookup and product facts
|   |   |-- add-product.js         # Add Product page controller
|   |   |-- update-price.js        # Product search before editing
|   |   |-- edit-product.js        # Existing-product edit page
|   |   |-- auth.js                # Login and registration behavior
|   |   `-- category.js            # Standalone category-page behavior
|   |-- components
|   |   |-- page-header.js         # Shared secondary-page header
|   |   |-- product-card.js        # Shared product rows and cards
|   |   |-- product-form.js        # Shared Add/Edit product form
|   |   |-- price-pulse.js         # Home price summaries and cards
|   |   |-- category-preview.js    # Compact Home category preview
|   |   `-- toast.js               # Temporary status messages
|   |-- models
|   |   |-- product.js             # Product normalization and validation
|   |   `-- category.js            # Category normalization and validation
|   |-- repositories
|   |   `-- product-repository.js  # Stable interface to mock product data
|   |-- services
|   |   |-- data.js                # Mock products and categories
|   |   |-- search-service.js      # Shared search and filtering
|   |   |-- csv-service.js         # CSV import selection and export
|   |   |-- barcode.js             # Camera barcode controls
|   |   |-- responsive.js          # Responsive size helper
|   |   |-- utils.js               # Shared formatting helpers
|   |   `-- supabase.js            # Existing client configuration
|   |-- state
|   |   `-- store.js               # Session, active store, and selection
|   |-- storage
|   |   `-- local-storage.js       # Shared browser-storage adapter
|   `-- constants
|       `-- app-constants.js       # Shared fixed values and defaults
|-- assets                         # Local media
`-- css/pages                      # Reserved for future page-only styles
tests
|-- app-modules.test.js            # Automated module tests
`-- README.md                      # Beginner test instructions
```

## 3. Shared application shell

`index.html` owns one shared application shell containing:

- Home
- the reusable `secondaryPage` area
- one Bottom Navigation Bar
- one floating Add Product button
- the shared toast and CSV file input

Browse, Updates, Settings, Profile, Product Details, Add Product, Update Price,
and Edit Product render inside `secondaryPage`. They do not create duplicate
navigation bars or separate application shells.

The standalone category document is kept because selecting a Home category
opens `pages/categories/category.html`. The older root `settings.html` remains
only as a redirect for old bookmarks.

## 4. Required loading order

The main page loads JavaScript in dependency order:

1. constants and models
2. mock data and Product Repository
3. utilities, local storage, and shared state
4. responsive, search, toast, CSV, and shared components
5. page controllers
6. Home coordination
7. shared navigation
8. barcode controls

The login and category documents load only the smaller set of files they need.
All local JavaScript references were checked and resolve to existing files.

CSS is loaded through `src/css/styles.css` in this order:

1. `tokens.css`
2. `base.css`
3. `layout.css`
4. `components.css`

All local HTML stylesheet, script, link, and CSS import references were
verified successfully.

## 5. Verification results

Final review completed on July 31, 2026.

| Area | Result |
| --- | --- |
| JavaScript syntax | Passed for every file in `src` |
| Automated tests | 7 passed, 0 failed |
| HTML and CSS file references | All resolved |
| Script loading order | Correct for the shared dependencies |
| Shared navigation | Home, Browse, Updates, and Settings passed |
| Secondary pages | Profile, Product Details, Add, Update, and Edit passed |
| Back buttons | Passed, including context-correct Edit Item return paths |
| Home search | Partial product search passed |
| Browse search and filters | Passed |
| Category browsing and search | Passed |
| Price Pulse and Updates | Rendered correctly from mock data |
| Settings CSV controls | Import and Export handlers are connected |
| CSV module behavior | Tested column order and blank optional fields |
| Barcode controls | Home and product-form buttons are present and connected |
| Console errors | None during reviewed browser flows |
| Responsive layout | No horizontal overflow at 320, 768, or 1280 pixels |
| Bottom navigation spacing | Fixed bar and content clearance verified |

Run the automated checks with:

```text
npm.cmd test
```

## 6. File responsibility rule

- Page files display and coordinate one screen.
- Components render reusable interface pieces.
- Services handle reusable operations such as search, CSV, and barcode work.
- Models clean and validate data.
- The Product Repository is the only shared interface for product-list
  operations.
- State stores the current session and selected product.
- Storage provides one safe interface to `localStorage`.
- Constants hold repeated fixed values.
- CSS layers keep design values, browser defaults, layout, and components
  separated.

`home.js` remains the coordinator for the shared shell. This is intentional:
it connects Home actions to the separate page controllers without copying
their markup or business logic.

## 7. Intentionally deferred work

These items are outside Phase 5 and were not changed:

- replacing mock products with real Supabase records
- production authentication, secure store creation, and Row Level Security
- removing the prototype PIN approach as part of the approved authentication
  design
- real multi-device synchronization and offline conflict handling
- full camera testing on a physical supported device with permission granted
- complete end-to-end automation for browser clicks, file pickers, downloads,
  and camera permission
- a future build process that could move the root `index.html`

The existing Supabase files were left untouched. Phase 5 verifies the
prototype's organization; secure database and authentication work belongs to
the later database, authentication, and security phases.
