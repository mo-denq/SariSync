/*
  Shared scanner: one camera stream, product-only decoding and explicit results.
  A generation number cancels late camera requests when the user closes it.
*/
(() => {
  const get = id => document.getElementById(id);
  const slot = get('barcodeFeature');
  if (!slot) return;
  slot.innerHTML = '<button id="scanButton" class="scan-button" type="button" aria-label="Scan Barcode"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#barcodeScanIcon"></use></svg></button>';
  document.body.insertAdjacentHTML('beforeend', '<section id="scannerPanel" class="scanner-panel" hidden role="dialog" aria-modal="true" aria-labelledby="scannerTitle"><div class="scanner-card"><div class="scanner-header"><div><p class="eyebrow">CAMERA SCANNER</p><h2 id="scannerTitle">Scan a barcode</h2></div><button id="closeScanner" class="close-button" type="button" aria-label="Close scanner">×</button></div><div class="camera-frame"><video id="scannerVideo" autoplay playsinline muted></video><div class="scan-guide" aria-hidden="true"></div></div><p id="scannerStatus" class="scanner-status" role="status"></p><button id="retryScanner" class="text-button" type="button" hidden>Retry camera</button><button id="fallbackScanner" class="text-button" type="button" hidden>Try alternative scanner</button><p class="subtle">Keep the barcode well lit and steady. You can also close this window and type the barcode or search by name.</p></div></section>');

  const PRODUCT_BARCODE_FORMATS = ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'CODE_128', 'CODE_39'];
  let stream = null, detector = null, reader = null, timer = null;
  let generation = 0, callback = null, opener = null;
  const status = text => { get('scannerStatus').textContent = text; };

  function releaseCamera() {
    clearTimeout(timer);
    stream?.getTracks().forEach(track => track.stop());
    stream = null;
    get('scannerVideo').srcObject = null;
    detector = null;
    reader = null;
  }
  function stopScanner() {
    generation += 1;
    releaseCamera();
    callback = null;
    get('scannerPanel').hidden = true;
    opener?.focus?.();
  }
  function openFallbackScanner() {
    const ZXing = window.ZXingBrowser;
    if (!ZXing?.BrowserMultiFormatOneDReader) {
      throw new Error('The scanner library could not load. Reconnect and reload this page, or type the barcode manually.');
    }
    // A real hints map prevents the old undefined-map crash on the iOS path.
    reader = new ZXing.BrowserMultiFormatOneDReader(new Map());
    reader.possibleFormats = PRODUCT_BARCODE_FORMATS.map(name => ZXing.BarcodeFormat[name]);
    detector = null;
    get('fallbackScanner').hidden = true;
  }
  function showError(error) {
    releaseCamera();
    const messages = {
      NotAllowedError: 'Camera access was denied. Allow camera access for SariSync in your browser settings, then retry.',
      NotFoundError: 'No camera was found. Connect a camera or type the barcode manually.',
      NotReadableError: 'The camera is busy. Close other camera apps, then retry.'
    };
    status(messages[error?.name] || error?.message || 'The camera could not start. Retry or type the barcode manually.');
    get('retryScanner').hidden = false;
  }
  async function openScanner(onScan = null) {
    stopScanner();
    const token = generation;
    opener = document.activeElement;
    // A Home button click passes an event; only Add/Edit supplies a callback.
    callback = typeof onScan === 'function' ? onScan : null;
    get('scannerPanel').hidden = false;
    get('retryScanner').hidden = true;
    get('fallbackScanner').hidden = true;
    get('closeScanner').focus();
    status('Requesting camera access…');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Open SariSync through HTTPS or localhost to allow camera access.');
      const acquired = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false
      });
      if (token !== generation) { acquired.getTracks().forEach(track => track.stop()); return; }
      stream = acquired;
      const video = get('scannerVideo');
      video.muted = true;
      video.setAttribute('playsinline', '');
      video.srcObject = stream;
      await video.play();
      if (token !== generation) return;
      try {
        if (!window.BarcodeDetector) throw new Error('Use fallback');
        const formats = PRODUCT_BARCODE_FORMATS.map(name => name.toLowerCase());
        if (window.BarcodeDetector.getSupportedFormats) {
          const supported = await window.BarcodeDetector.getSupportedFormats();
          if (!formats.every(name => supported.includes(name))) throw new Error('Use fallback');
        }
        if (token !== generation) return;
        detector = new window.BarcodeDetector({ formats });
        get('fallbackScanner').hidden = false;
      } catch {
        if (token !== generation) return;
        openFallbackScanner();
      }
      status('Point the camera at a product barcode.');
      scanFrame(token);
    } catch (error) { if (token === generation) showError(error); }
  }
  async function scanFrame(token) {
    if (token !== generation) return;
    let code = null;
    try {
      const video = get('scannerVideo');
      if (video.readyState >= 2 && video.videoWidth > 0) {
        if (detector) {
          const results = await detector.detect(video);
          code = results.find(result => PRODUCT_BARCODE_FORMATS.includes(String(result.format).toUpperCase()))?.rawValue;
        } else if (reader) {
          const result = reader.decode(video);
          if (PRODUCT_BARCODE_FORMATS.some(name => window.ZXingBrowser.BarcodeFormat[name] === result.getBarcodeFormat())) code = result.getText();
        }
      }
    } catch (error) {
      if (token !== generation) return;
      if (detector) {
        try { openFallbackScanner(); } catch (failure) { showError(failure); return; }
      // ZXing's minified build shortens error names; getKind stays stable.
      } else if (!['NotFoundException', 'ChecksumException', 'FormatException'].includes(error?.getKind?.() || error?.name)) {
        showError(error); return;
      }
    }
    if (token !== generation) return;
    if (code) {
      status('Barcode read. Opening result…');
      // A short acknowledgement makes the switch to the result less abrupt.
      timer = setTimeout(() => { if (token === generation) handleBarcode(code); }, 160);
    } else timer = setTimeout(() => scanFrame(token), 180);
  }
  function handleBarcode(value) {
    const code = String(value).trim();
    const onScan = callback;
    stopScanner();
    if (onScan) { onScan(code); return; }
    const product = window.SariSyncSearchService.findByBarcode(window.SariSyncProductRepository.getAllProducts(), code);
    window.SariSyncNavigation.goTo('Home');
    if (product) {
      window.SariSync.showProduct(product.id);
      window.SariSyncToast.show('Product found.');
    } else {
      get('searchInput').value = '';
      window.SariSync.searchProducts('');
      get('searchInput').focus();
      const message = 'No product matches this barcode. Search by name, then edit the existing product to add its barcode.';
      get('searchResults').textContent = message;
      window.SariSyncToast.show(message);
    }
  }
  get('scanButton').addEventListener('click', () => openScanner());
  get('closeScanner').addEventListener('click', stopScanner);
  get('retryScanner').addEventListener('click', () => openScanner(callback));
  get('fallbackScanner').addEventListener('click', () => {
    try { openFallbackScanner(); status('Alternative scanner ready. Hold the barcode steady.'); }
    catch (error) { showError(error); }
  });
  document.addEventListener('keydown', event => {
    if (get('scannerPanel').hidden) return;
    if (event.key === 'Escape') stopScanner();
    if (event.key === 'Tab') {
      const buttons = [get('closeScanner'), get('retryScanner'), get('fallbackScanner')].filter(button => !button.hidden);
      const index = buttons.indexOf(document.activeElement);
      event.preventDefault();
      buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
    }
  });
  window.addEventListener('pagehide', stopScanner);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopScanner(); });
  window.SariSyncBarcode = { open: openScanner, close: stopScanner };
})();
