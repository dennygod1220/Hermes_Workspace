'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const longBtn = document.querySelector('.btn-long');
  const shortBtn = document.querySelector('.btn-short');

  longBtn?.addEventListener('click', () => {
    longBtn.classList.add('active');
    shortBtn.classList.remove('active');
  });
  shortBtn?.addEventListener('click', () => {
    shortBtn.classList.add('active');
    longBtn.classList.remove('active');
  });

  // Check if we're on a TradingView chart page
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0]?.url || '';
    if (!url.includes('tradingview.com/chart')) {
      const status = document.getElementById('status');
      status.className = 'status error';
      status.classList.remove('hidden');
      status.textContent = '⚠️ 請先開啟 TradingView 圖表頁面';
      const btn = document.getElementById('captureBtn');
      if (btn) btn.disabled = true;
    }
  });

  // Load current price/symbol
  chrome.runtime.sendMessage({ action: 'getPageInfo' }, (response) => {
    if (chrome.runtime.lastError) return;
    if (response) {
      const sd = document.getElementById('symbolDisplay');
      const pd = document.getElementById('priceDisplay');
      const ep = document.getElementById('entryPrice');
      if (sd) sd.textContent = response.symbol || '--';
      if (pd) pd.textContent = response.price || '--';
      if (ep) ep.value = response.price || '';
    }
  });

  document.getElementById('captureBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('captureBtn');
    btn.disabled = true;
    btn.textContent = '⏳ 截圖中...';
    const status = document.getElementById('status');
    status.classList.add('hidden');
    status.classList.remove('success', 'error');

    // Validate entry price
    const entryPriceInput = document.getElementById('entryPrice');
    if (!entryPriceInput?.value.trim()) {
      btn.disabled = false;
      btn.textContent = '📸 截圖分析';
      status.className = 'status error';
      status.classList.remove('hidden');
      status.textContent = '❌ 請輸入進場價位';
      return;
    }

    const direction = document.querySelector('.btn-long.active') ? 'long' : 'short';
    const tradeData = {
      direction,
      entryPrice: entryPriceInput.value,
      stopLoss: document.getElementById('stopLoss')?.value || '',
      takeProfit: document.getElementById('takeProfit')?.value || '',
      notes: document.getElementById('notes')?.value || '',
      indicators: {
        vrvp: document.getElementById('vrvpCheck')?.checked || false,
        ema: document.getElementById('emaCheck')?.checked || false,
        kdj: document.getElementById('kdjCheck')?.checked || false,
        ppo: document.getElementById('ppoCheck')?.checked || false,
        stochRsi: document.getElementById('stochRsiCheck')?.checked || false
      },
      timestamp: new Date().toISOString()
    };

    // Ask background to capture & store in session storage
    chrome.runtime.sendMessage({ action: 'captureAndStore', tradeData }, async (response) => {
      if (chrome.runtime.lastError) {
        btn.disabled = false;
        btn.textContent = '📸 截圖分析';
        status.className = 'status error';
        status.classList.remove('hidden');
        status.textContent = '❌ 通訊失敗: ' + chrome.runtime.lastError.message;
        return;
      }

      if (!response?.success) {
        btn.disabled = false;
        btn.textContent = '📸 截圖分析';
        status.className = 'status error';
        status.classList.remove('hidden');
        status.textContent = '❌ 錯誤: ' + (response?.error || '未知錯誤');
        return;
      }

      const { storageKey, filename } = response;

      // Read capture data from session storage
      try {
        const stored = await chrome.storage.session.get(storageKey);
        const capture = stored[storageKey];
        if (!capture) throw new Error('無法讀取截圖資料');

        const { dataUrl, payload } = capture;

        // Trigger browser download using <a download> — Chrome 147 ignores
        // chrome.downloads.download() filename for blob/data URLs
        function triggerDownload(blobUrl, name) {
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = name;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          // Keep blob URL alive long enough for download to start
          setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        }

        // --- Download PNG ---
        const pngResp = await fetch(dataUrl);
        const pngBlob = await pngResp.blob();
        triggerDownload(URL.createObjectURL(pngBlob), `${filename}.png`);

        // --- Download JSON ---
        const jsonBlob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        triggerDownload(URL.createObjectURL(jsonBlob), `${filename}.json`);

        // Clean up session storage
        await chrome.storage.session.remove(storageKey);

        btn.disabled = false;
        btn.textContent = '📸 截圖分析';
        status.className = 'status success';
        status.classList.remove('hidden');
        status.textContent = `✅ 已儲存: ${filename}.png`;

      } catch (err) {
        btn.disabled = false;
        btn.textContent = '📸 截圖分析';
        status.className = 'status error';
        status.classList.remove('hidden');
        status.textContent = '❌ 下載失敗: ' + err.message;
      }
    });
  });
});
