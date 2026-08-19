# FILE: tests/README.md | FOLDER: tests

# SariSync tests

These automated checks confirm that shared data rules continue working after
the project is reorganized.

The current test file covers:

- App Constants
- Product Model
- Product Repository
- Search Service
- CSV Service
- Local Storage

## How to run the tests

1. Open the SariSync project in VS Code.
2. Open **Terminal** from the top menu.
3. Make sure the terminal is inside the `Digital Price Book` folder.
4. Type the following command and press Enter:

```text
npm.cmd test
```

`npm.cmd` is recommended for your Windows PowerShell terminal. If `npm test`
already works on another computer or terminal, that command runs the same
tests.

When everything works, the terminal shows passing tests and no failures.

These tests use small temporary sample records. They do not change the real
prototype data, open the browser, or connect to Supabase.
