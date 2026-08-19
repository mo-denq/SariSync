/*
  FILE: src/js/models/category.js
  PURPOSE: Defines how SariSync cleans, compares, and validates category names.

  RESPONSIBILITIES:
  - Remove extra spaces around a category name.
  - Convert the comparison form of a category name to UPPERCASE.
  - Confirm that a category name is not empty.
  - Compare two category names without letter-case differences.

  BEGINNER NOTE:
  The normalized uppercase name is used for checking and matching. Existing
  display labels such as "Canned Goods" remain unchanged in the current UI.
  This file does not store categories and does not connect to Supabase.
*/
(function initialiseCategoryModel() {
  function trimName(value) {
    return String(value ?? '').trim();
  }

  function normalizeName(value) {
    return trimName(value).toUpperCase();
  }

  function validate(value) {
    const name = normalizeName(value);
    const errors = [];

    if (!name) {
      errors.push('Category name is required.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      name
    };
  }

  function requireValid(value) {
    const result = validate(value);
    if (!result.isValid) {
      throw new Error(result.errors[0]);
    }
    return result.name;
  }

  function matches(firstName, secondName) {
    return normalizeName(firstName) === normalizeName(secondName);
  }

  /* Returns a new list, so a page can use alphabetical categories without
     changing the shared Home preview's future most-used/recent ordering. */
  function sortAlphabetically(categories) {
    return [...(categories || [])].sort((first, second) =>
      normalizeName(first.name).localeCompare(normalizeName(second.name))
    );
  }

  window.SariSyncCategoryModel = {
    trimName,
    normalizeName,
    validate,
    requireValid,
    matches,
    sortAlphabetically
  };
})();
