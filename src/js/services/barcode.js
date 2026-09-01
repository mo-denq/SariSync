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

  const PRODUCT_BARCODE_FORMATS = ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'CODE_128', 'CODE_39'];
  let stream = null;
  let detector = null;
  let fallbackControls = null;
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
      /* Prefer the small, native browser reader when it is available. Older
         desktops and iPhones then use the ZXing fallback below instead. */
      if (window.BarcodeDetector) {
        await openNativeScanner();
      } else {
        await openFallbackScanner();
      }
    } catch (error) {
      const message = window.SariSyncFeedback?.messageFor(
        error,
        'Camera permission was denied. Allow camera access in your browser settings and try again.'
      );
      status(message);
      window.SariSyncToast?.show(message);
    }
  }

  async function openNativeScanner() {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });
    const video = get('scannerVideo');
    video.srcObject = stream;
    await video.play();

    // SariSync scans product barcodes only. QR codes are intentionally not
    // included in Version 1.
    try {
      detector = new window.BarcodeDetector({
        formats: PRODUCT_BARCODE_FORMATS.map(format => format.toLowerCase())
      });
    } catch {
      /* A browser can expose BarcodeDetector but reject one of the selected
         formats. Release its camera before safely changing to ZXing. */
      stopCameraStream();
      await openFallbackScanner();
      return;
    }

    scanning = true;
    status('Point the camera at a product barcode.');
    scanFrame();
  }

  /* ZXing reads the same one-dimensional product barcodes with a normal
     browser camera. It is used only when the built-in BarcodeDetector cannot
     run, so modern Android browsers keep their quicker native path. */
  async function openFallbackScanner() {
    const ZXing = window.ZXingBrowser;
    if (!ZXing?.BrowserMultiFormatOneDReader) {
      status('Barcode scanning is unavailable in this browser. Type the barcode manually instead.');
      return;
    }

    const reader = new ZXing.BrowserMultiFormatOneDReader();
    const supportedFormats = PRODUCT_BARCODE_FORMATS
      .map(format => ZXing.BarcodeFormat?.[format])
      .filter(Boolean);
    if (supportedFormats.length) reader.possibleFormats = supportedFormats;

    scanning = true;
    status('Point the camera at a product barcode.');
    const controls = await reader.decodeFromConstraints(
      { video: { facingMode: { ideal: 'environment' } }, audio: false },
      get('scannerVideo'),
      (result) => {
        if (!scanning || !result?.getText) return;
        handleBarcode(result.getText());
      }
    );

    // If a person closed the scanner while the camera was still starting,
    // immediately release the newly created fallback stream.
    if (!scanning) {
      controls?.stop?.();
      return;
    }
    fallbackControls = controls;
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

  function stopCameraStream() {
    if (!stream) return;
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }

  function stopScanner() {
    scanning = false;
    detector = null;
    scanCallback = null;
    fallbackControls?.stop?.();
    fallbackControls = null;
    stopCameraStream();
    get('scannerVideo').srcObject = null;
    get('scannerPanel').hidden = true;
  }

  get('scanButton').addEventListener('click', openScanner);
  get('closeScanner').addEventListener('click', stopScanner);
  window.SariSyncBarcode = { open: openScanner };
})();
