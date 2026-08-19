/*
  FILE: src/js/components/product-form.js
  PURPOSE: Provides the one shared product form used by Add Product and Edit
  Item Details.

  RESPONSIBILITIES:
  - Render every product field in a consistent layout.
  - Fill the fields with an existing product when editing.
  - Validate required fields through the form's input rules.
  - Normalize product names to UPPERCASE before saving.
  - Add a new product or update the selected product.
  - Connect the barcode button to the shared camera scanner.
  - Notify the page after product data has changed.

  This component does not decide which page is visible. add-product.js and
  edit-product.js control their page headings and navigation.
*/
(function initialiseProductForm() {
  function formMarkup(product, categories) {
    const item = product || {
      barcode: '',
      name: '',
      costPrice: '',
      retail: '',
      wholesale: '',
      bottleDeposit: '',
      notes: '',
      category: window.SariSyncConstants.DEFAULT_PRODUCT_CATEGORY
    };

    return `
      <form id="productForm" class="product-form page-product-form">
        <div class="form-scroll">
          <div class="form-row">
            <label for="productName">PRODUCT NAME</label>
            <input id="productName" required value="${item.name || ''}" placeholder="e.g. LUCKY ME PANCIT CANTON" />
          </div>

          <div class="form-row">
            <label for="productBarcode">BARCODE (OPTIONAL)</label>
            <div class="barcode-field">
              <input id="productBarcode" value="${item.barcode || ''}" placeholder="Scan or type barcode" />
              <button id="fieldScanButton" type="button" aria-label="Scan Barcode" title="Scan Barcode">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <use href="#barcodeScanIcon"></use>
                </svg>
              </button>
            </div>
          </div>

          <div class="form-row">
            <label for="productCategory">CATEGORY</label>
            <select id="productCategory">
              ${window.SariSyncCategoryModel.sortAlphabetically(categories).map(category => `
                <option ${window.SariSyncCategoryModel.matches(category.name, item.category) ? 'selected' : ''}>${category.name}</option>
              `).join('')}
            </select>
          </div>

          <div class="form-row">
            <label for="costPrice">COST PRICE (₱)</label>
            <input id="costPrice" min="0" step=".01" type="number" value="${item.costPrice || ''}" placeholder="0.00" />
          </div>

          <div class="form-row">
            <label for="retailPrice">RETAIL PRICE (₱)</label>
            <input id="retailPrice" required min="0" step=".01" type="number" value="${item.retail || ''}" placeholder="0.00" />
          </div>

          <div class="form-row">
            <label for="wholesalePrice">WHOLESALE PRICE (OPTIONAL)</label>
            <input id="wholesalePrice" min="0" step=".01" type="number" value="${item.wholesale || ''}" placeholder="0.00" />
          </div>

          <div class="form-row">
            <label for="bottleDeposit">BOTTLE DEPOSIT (₱)</label>
            <input id="bottleDeposit" min="0" step=".01" type="number" value="${item.bottleDeposit || ''}" placeholder="0.00" />
          </div>

          <div class="form-row">
            <label for="productNotes">NOTES</label>
            <input id="productNotes" value="${item.notes || ''}" placeholder="e.g. Per piece, size, supplier" />
          </div>
        </div>

        <div class="form-footer">
          <button class="save-button" type="submit">
            ${product ? 'Save changes' : 'Add to price book'}
          </button>
        </div>
      </form>
    `;
  }

  function mount(container, options) {
    const {
      product = null,
      categories,
      activeDeviceName,
      onSaved
    } = options;
    const isNew = !product;

    container.insertAdjacentHTML('beforeend', formMarkup(product, categories));

    const form = container.querySelector('#productForm');
    const field = id => form.querySelector(`#${id}`);

    form.addEventListener('submit', async event => {
      event.preventDefault();

      const values = window.SariSyncProductModel.normalize({
        barcode: field('productBarcode').value.trim(),
        name: field('productName').value,
        category: field('productCategory').value,
        costPrice: field('costPrice').value,
        retail: field('retailPrice').value,
        wholesale: field('wholesalePrice').value,
        bottleDeposit: field('bottleDeposit').value,
        notes: field('productNotes').value
      });

      const validation = window.SariSyncProductModel.validate(values);
      if (!validation.isValid) {
        window.SariSyncToast.show(validation.errors[0]);
        return;
      }

      /* Both form versions now save through Supabase. Editing uses the
         protected Phase 9 function, which keeps the Price Pulse audit trail. */
      if (window.SariSyncProductRepository.isCloudDataLoaded()) {
        const selectedCategory = categories.find(category =>
          window.SariSyncCategoryModel.matches(category.name, validation.product.category)
        );
        if (!selectedCategory?.id) {
          window.SariSyncToast.show('Choose an active category from your store.');
          return;
        }

        const saveButton = form.querySelector('.save-button');
        const originalLabel = saveButton.textContent;
        saveButton.disabled = true;
        saveButton.textContent = isNew ? 'Saving product...' : 'Saving changes...';

        try {
          /* Use the raw fields for optional numeric values. An empty field is
             sent as null, which means “not provided,” instead of a false 0. */
          const optionalNumber = input => input.value === '' ? null : Number(input.value);
          const databaseValues = {
            ...validation.product,
            costPrice: optionalNumber(field('costPrice')),
            retail: Number(field('retailPrice').value),
            wholesale: optionalNumber(field('wholesalePrice')),
            bottleDeposit: optionalNumber(field('bottleDeposit'))
          };

          if (isNew) {
            await window.SariSyncProductDataService.addProductForCurrentUser(
              databaseValues,
              selectedCategory.id
            );
          } else {
            await window.SariSyncProductDataService.updateProductForCurrentUser(
              product.id,
              databaseValues,
              selectedCategory.id
            );
          }

          await Promise.resolve(onSaved?.());
          window.SariSyncNavigation.goTo('Home');
          window.SariSyncToast.show(isNew
            ? 'Product added to the shared price book'
            : 'Product details saved to the shared price book');
        } catch (error) {
          window.SariSyncToast.show(error?.message || (isNew
            ? 'Unable to add this product. Try again.'
            : 'Unable to save these changes. Try again.'));
        } finally {
          saveButton.disabled = false;
          saveButton.textContent = originalLabel;
        }
        return;
      }

      if (isNew) {
        window.SariSyncProductRepository.addProduct({
          ...validation.product,
          unit: 'per case',
          tone: window.SariSyncConstants.DEFAULT_PRODUCT_TONE,
          updated: 'Just now',
          updatedAt: new Date().toISOString(),
          updatedBy: activeDeviceName,
          change: 'New item',
          direction: 'up'
        });
      } else {
        window.SariSyncProductRepository.updateProduct(product.id, {
          ...validation.product,
          updated: 'Just now',
          updatedAt: new Date().toISOString(),
          updatedBy: activeDeviceName,
          change: 'Updated',
          direction: 'up'
        });
      }

      onSaved();
      window.SariSyncNavigation.goTo('Home');
      window.SariSyncToast.show(isNew
        ? 'Product added to the shared book'
        : 'Price book updated for everyone');
    });

    field('fieldScanButton').addEventListener('click', () => {
      window.SariSyncBarcode?.open(code => {
        field('productBarcode').value = code;
        window.SariSyncToast.show('Barcode added to this product');
      });
    });
  }

  window.SariSyncProductForm = { mount };
})();
