# FILE: src/js/repositories/README.md | FOLDER: src/js/repositories

# Data repositories

A repository gives pages one consistent way to load and save data. This allows
SariSync to switch from prototype data to Supabase later without rewriting
every page.

`product-repository.js` currently reads and changes the mock array from
`services/data.js`. It provides functions to get, find, add, and update
products. It does not connect to Supabase yet.
