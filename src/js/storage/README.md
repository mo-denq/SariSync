# FILE: src/js/storage/README.md | FOLDER: src/js/storage

# Local storage adapters

This folder contains code that saves and reads offline or cached data from the
device. Pages should use the shared adapter instead of talking to
`localStorage` directly.

- `local-storage.js` safely reads, saves, and removes browser values.
- It preserves the existing `sariSyncSession` and `sariSyncProducts` keys.

This is prototype browser storage, not multi-device synchronization or a
Supabase database connection.
