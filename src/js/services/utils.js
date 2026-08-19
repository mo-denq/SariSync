/*
  FILE: src/js/services/utils.js
  SHARED FORMATTING HELPERS
  Keep common text and price formatting here so every page displays names and
  Philippine peso values consistently.
*/
function titleCaseText(value) {
  return String(value || '').trim().toLowerCase().replace(/(^|[\s'-])\p{L}/gu, letter => letter.toUpperCase());
}

window.SariSyncUtils = {
  titleCase: titleCaseText,
  formatStoreName(value) {
    /* Store names are normally title case. A short code that begins with a
       number, such as 4YZ, stays uppercase so it remains a store identifier
       rather than becoming the less readable "4yz". */
    return titleCaseText(value).replace(/\b\d+[a-z]{1,5}\b/gi, code => code.toUpperCase());
  },
  firstName(value) {
    return String(value || '').trim().split(/\s+/)[0] || '';
  },
  initials(value, maximumLetters = 2) {
    return String(value || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(name => name[0])
      .join('')
      .slice(0, maximumLetters)
      .toUpperCase();
  },
  peso(value) {
    return `₱${Number(value).toFixed(2)}`;
  }
};
