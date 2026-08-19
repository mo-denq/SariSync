/*
  FILE: src/js/services/data.js
  SHARED PRODUCT DATA
  The sample arrays below are kept only as development reference material.
  They are no longer exposed to the active application. The signed-in store's
  real products and categories are loaded by product-data-service.js.
*/
const initialProducts = [
  { id: 1, barcode: '', name: 'LUCKY ME PANCIT CANTON CALAMANSI', category: 'Snacks & Sweets', costPrice: 13, retail: 16, previousPrice: 15, wholesale: 180, bottleDeposit: 0, notes: 'Per piece', unit: 'per box of 12', tone: '#fce2e6', updated: 'Today, 8:42 AM', updatedAt: '2026-07-20T08:42:00', change: '+ ₱1.00', direction: 'up' },
  { id: 2, barcode: '', name: 'BEAR BRAND FORTIFIED 33G', category: 'Beverages', costPrice: 12.5, retail: 14, previousPrice: 14.5, wholesale: 155, bottleDeposit: 0, notes: 'Per sachet', unit: 'per pack of 10', tone: '#dff3f2', updated: 'Today, 7:16 AM', updatedAt: '2026-07-20T07:16:00', change: '− ₱0.50', direction: 'down' },
  { id: 3, barcode: '', name: 'ARGENTINA CORNED BEEF 100G', category: 'Canned Goods', costPrice: 35.5, retail: 39, previousPrice: 37, wholesale: 442, bottleDeposit: 0, notes: '100g can', unit: 'per tray of 12', tone: '#fff1cc', updated: 'Yesterday, 5:24 PM', updatedAt: '2026-07-19T17:24:00', change: '+ ₱2.00', direction: 'up' },
  { id: 4, barcode: '', name: 'COCA-COLA SAKTO 200ML', category: 'Beverages', costPrice: 11, retail: 14, previousPrice: 14, wholesale: 280, bottleDeposit: 0, notes: 'Returnable bottle', unit: 'per case of 24', tone: '#dff3f2', updated: 'Yesterday, 3:05 PM', updatedAt: '2026-07-19T15:05:00', change: 'No change', direction: 'same' },
  { id: 5, barcode: '', name: 'SILVER SWAN SOY SAUCE 200ML', category: 'Pantry & Condiments', costPrice: 15.5, retail: 18, previousPrice: 17, wholesale: 194, bottleDeposit: 0, notes: '200ml bottle', unit: 'per case of 12', tone: '#eee5fa', updated: 'Jul 11, 2:10 PM', updatedAt: '2026-07-11T14:10:00', change: '+ ₱1.00', direction: 'up' },
  { id: 6, barcode: '', name: 'NOVA COUNTRY CHEDDAR 40G', category: 'Snacks & Sweets', costPrice: 10, retail: 12, previousPrice: 12, wholesale: 132, bottleDeposit: 0, notes: '40g bag', unit: 'per pack of 12', tone: '#fce2e6', updated: 'Jul 10, 11:32 AM', updatedAt: '2026-07-10T11:32:00', change: 'No change', direction: 'same' },
  { id: 7, barcode: '', name: 'JOY DISHWASHING LIQUID 250ML', category: 'Household & General', costPrice: 43, retail: 48, previousPrice: 45, wholesale: 267, bottleDeposit: 0, notes: '250ml pouch', unit: 'per case of 6', tone: '#eee5fa', updated: 'Jul 09, 4:16 PM', updatedAt: '2026-07-09T16:16:00', change: '+ ₱3.00', direction: 'up' },
  { id: 8, barcode: '', name: 'CENTURY TUNA FLAKES 180G', category: 'Canned Goods', costPrice: 41.5, retail: 45, previousPrice: 46, wholesale: 500, bottleDeposit: 0, notes: '180g can', unit: 'per tray of 12', tone: '#fff1cc', updated: 'Jul 08, 1:20 PM', updatedAt: '2026-07-08T13:20:00', change: '− ₱1.00', direction: 'down' }
];

const storeCategories = [
  { name: 'Beverages', className: 'beverages' },
  { name: 'Canned Goods', className: 'canned' },
  { name: 'Pantry & Condiments', className: 'pantry' },
  { name: 'Snacks & Sweets', className: 'snacks' },
  { name: 'Personal Care', className: 'personal-care' },
  { name: 'Household & General', className: 'household' },
  { name: 'School Supplies', className: 'school' },
  { name: 'Vegetables', className: 'vegetables' },
  { name: 'Tobacco', className: 'tobacco' }
];

initialProducts.forEach(product => {
  product.updatedBy = window.SariSyncConstants.DEFAULT_DEVICE_NAME;
});
// Never expose demo items to the live app. This prevents sample products from
// appearing together with the signed-in store's Supabase price book.
window.SariSyncData = { products: [], categories: [] };
