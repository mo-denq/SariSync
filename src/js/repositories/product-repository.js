/*
  FILE: src/js/repositories/product-repository.js
  PURPOSE: Gives the app one consistent place to read and change product data.

  RESPONSIBILITIES:
  - Return the complete product list.
  - Find one product using its unique ID.
  - Add a new product to the beginning of the price book.
  - Update an existing product without replacing its identity.

  DATA NOTE:
  product-data-service.js loads real Supabase records, then this repository
  keeps that current list available to the visible app screens.
*/
(function initialiseProductRepository() {
  const products = [];
  const ProductModel = window.SariSyncProductModel;
  let cloudDataLoaded = false;

  function getAllProducts() {
    return products;
  }

  function replaceAllProducts(nextProducts) {
    products.splice(0, products.length, ...nextProducts);
    cloudDataLoaded = true;
    return products;
  }

  function isCloudDataLoaded() {
    return cloudDataLoaded;
  }

  // Called only after the server has accepted a save, using its real UUID.
  function upsertSavedProduct(product) {
    if (!product?.id) return;
    const existing = findProductById(product.id);
    if (existing) Object.assign(existing, product);
    else products.unshift(product);
  }

  function findProductById(productId) {
    return products.find(product =>
      String(product.id) === String(productId)
    ) || null;
  }

  function addProduct(productValues) {
    const newProduct = {
      ...ProductModel.requireValid(productValues),
      id: Date.now()
    };

    products.unshift(newProduct);
    return newProduct;
  }

  function updateProduct(productId, changes) {
    const product = findProductById(productId);
    if (!product) return null;

    const updatedProduct = ProductModel.requireValid({
      ...product,
      ...changes
    });

    Object.assign(product, updatedProduct);
    return product;
  }

  window.SariSyncProductRepository = {
    upsertSavedProduct,
    getAllProducts,
    replaceAllProducts,
    isCloudDataLoaded,
    findProductById,
    addProduct,
    updateProduct
  };
})();
