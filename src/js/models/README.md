# FILE: src/js/models/README.md | FOLDER: src/js/models

# Data models

Models describe the shape and rules of SariSync data.

- `category.js` trims, standardizes, validates, and compares category names.
- `product.js` cleans and validates product values before the Product
  Repository saves them.

The mock product records still live in `services/data.js`. Models do not store
product records, contain page UI, or connect to Supabase.
