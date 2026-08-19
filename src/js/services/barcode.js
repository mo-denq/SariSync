/*
  FILE: src/js/services/barcode.js
  BARCODE CAMERA FEATURE
  This self-contained feature adds the camera button to Home, opens the scanner
  panel, requests the rear camera, detects supported barcodes, and sends a
  scanned code back to the Home search/product-detail functions.
  It requires camera permission and a browser that supports BarcodeDetector.
*/
(() => {
  const featureSlot = document.getElementById('barcodeFeature');
  if (!featureSlot) return;

  featureSlot.innerHTML = `<button id="scanButton" class="scan-button" type="button" aria-label="Scan Barcode" title="Scan Barcode"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#barcodeScanIcon"></use></svg></button>`;
  document.body.insertAdjacentHTML('beforeend', `<section id="scannerPanel" class="scanner-panel" hidden aria-labelledby="scannerTitle"><div class="scanner-card"><div class="scanner-header"><div><p class="eyebrow">CAMERA SCANNER</p><h2 id="scannerTitle">Scan a barcode</h2></div><button id="closeScanner" class="close-button" type="button" aria-label="Close scanner">×</button></div><div class="camera-frame"><video id="scannerVideo" autoplay playsinline muted></video><div class="scan-guide" aria-hidden="true"></div></div><p id="scannerStatus" class="scanner-status">Point the camera at a product barcode.</p></div></section>`);

  let stream = null;
  let detector = null;
  let scanning = false;
  let scanCallback = null;
  const get = (id) => document.getElementById(id);
  const status = (message) => { get('scannerStatus').textContent = message; };

  async function openScanner(onScan = null) {
    scanCallback = onScan;
    get('scannerPanel').hidden = false;
    status('Requesting camera access…');
    if (!navigator.mediaDevices?.getUserMedia) { status('Camera access needs a modern browser opened through HTTPS or localhost.'); return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      const video = get('scannerVideo'); video.srcObject = stream; await video.play();
      if (!window.BarcodeDetector) { status('Camera is ready, but barcode detection is not supported in this browser. Try Chrome on Android.'); return; }
      // SariSync scans product barcodes only. QR-code scanning is not part of
      // Version 1, so it is intentionally not included in the detector list.
      try { detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'] }); }
      catch { detector = new window.BarcodeDetector(); }
      scanning = true; status('Point the camera at a product barcode.'); scanFrame();
    } catch { status('Camera access was not allowed. Check your browser permissions and try again.'); }
  }

  async function scanFrame() {
    if (!scanning || !detector) return;
    try {
      const results = await detector.detect(get('scannerVideo'));
      if (results.length && results[0].rawValue) { handleBarcode(results[0].rawValue); return; }
    } catch { status('Keep the barcode inside the yellow guide.'); }
    if (scanning) requestAnimationFrame(scanFrame);
  }

  function handleBarcode(code) {
    const callback = scanCallback;
    const app = window.SariSync;
    const product = window.SariSyncSearchService.findByBarcode(
      window.SariSyncProductRepository.getAllProducts(),
      code
    );
    stopScanner();
    if (callback) { callback(code); return; }
    get('searchInput').value = code;
    app.searchProducts(code);
    if (product) app.showProduct(product.id);
    else window.SariSyncToast.show(`Scanned ${code}. No matching item is saved yet.`);
  }

  function stopScanner() {
    scanning = false; detector = null; scanCallback = null;
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null; get('scannerVideo').srcObject = null; get('scannerPanel').hidden = true;
  }

  get('scanButton').addEventListener('click', openScanner);
  get('closeScanner').addEventListener('click', stopScanner);
  window.SariSyncBarcode = { open: openScanner };
})();
