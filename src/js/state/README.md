# FILE: src/js/state/README.md | FOLDER: src/js/state

# Central application state

This folder holds the app's current session and selection information in one
organized place.

`store.js` reads the existing `sariSyncSession` from `localStorage` and provides
the active physical-store name, device/user display name, and selected product.

The product list does not belong here. It remains managed by
`repositories/product-repository.js`.
