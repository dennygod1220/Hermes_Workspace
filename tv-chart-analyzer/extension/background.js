'use strict';

let lastPageInfo = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'pageInfo') {
    lastPageInfo = request.data;
    return;
  }

  if (request.action === 'getPageInfo') {
    sendResponse(lastPageInfo || { symbol: '--', price: '--' });
    return;
  }

  if (request.action === 'captureAndSave') {
    handleCaptureAndSave(request.tradeData, sender.tab?.id)
      .then(result => sendResponse(result));
    return true;
  }

  if (request.action === 'captureAndStore') {
    // Called from popup: capture screenshot, store in session storage, return key
    handleCaptureAndStore(request.tradeData)
      .then(result => sendResponse(result));
    return true;
  }
});

async function handleCaptureAndStore(tradeData) {
  try {
    const tab = await getActiveTab();
    if (!tab?.id) throw new Error('找不到 active tab');

    // Capture screenshot
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });

    // Re-grab latest price from page title
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const info = { symbol: '--', price: '--', indicators: {} };
          const m = document.title.match(/^(\S+)\s+([\d,]+\.[\d]{2})/);
          if (m) { info.symbol = m[1]; info.price = m[2]; }
          return info;
        }
      });
      if (result?.result) {
        lastPageInfo = { ...lastPageInfo, ...result.result };
      }
    } catch (e) { /* fallback */ }

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const filename = `tv_${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const pageInfo = lastPageInfo || {};

    const payload = {
      capturedAt: now.toISOString(),
      symbol: pageInfo.symbol || '--',
      price: pageInfo.price || '--',
      open: pageInfo.open,
      high: pageInfo.high,
      low: pageInfo.low,
      close: pageInfo.close,
      change: pageInfo.change,
      changePercent: pageInfo.changePercent,
      bid: pageInfo.bid,
      ask: pageInfo.ask,
      indicators: pageInfo.indicators || {},
      trade: tradeData
    };

    // Store in session storage for popup to retrieve (popup has DOM APIs)
    const storageKey = 'capture_' + Date.now();
    await chrome.storage.session.set({
      [storageKey]: { filename, dataUrl, payload }
    });

    return { success: true, storageKey, filename };
  } catch (error) {
    console.error('Capture failed:', error);
    return { success: false, error: error.message };
  }
}

async function getActiveTab() {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      resolve(tabs[0] || null);
    });
  });
}
