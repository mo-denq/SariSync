# FILE: src/js/components/README.md | FOLDER: src/js/components

# Shared components

Place reusable UI modules here as the prototype grows: product forms, bottom
navigation, page headers, search bars, product cards, settings tiles, profile
cards, and empty states. Components should receive the data and callbacks they
need instead of depending on a specific page.

`product-form.js` currently receives the prototype product list and performs
Add/Edit saves. When a product repository is introduced later, that repository
can replace direct array changes without changing the form's visual layout.

`toast.js` displays the existing temporary success and information messages
used across Home, Settings, CSV, product forms, and barcode scanning.

`product-card.js` renders the shared product mark plus the existing Browse,
search-result, and Updates row layouts.

`page-header.js` renders the section label, page title, description, and
optional Back arrow used by secondary pages.

`price-pulse.js` calculates and renders the Home dashboard's recent
price-change summary, cards, sorting, and empty state.

`category-preview.js` renders the compact category cards shown on Home while
Home decides how many cards fit the current screen.
