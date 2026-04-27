'use strict';

function extractPageInfo() {
  const info = {
    symbol: '--',
    price: '--',
    change: '--',
    changePercent: '--',
    indicators: {}
  };

  // Safety: body may not be ready
  if (!document.body) return info;

  // 1. Page title (最穩定)
  const title = document.title;
  const titleMatch = title.match(/^(\S+)\s+([\d,]+\.[\d]{2})\s+[▲▼]\s+([+-]?[\d.]+%)/);
  if (titleMatch) {
    info.symbol = titleMatch[1];
    info.price = titleMatch[2];
    info.changePercent = titleMatch[3];
  }

  // 2. OHLC from toolbar text
  const allText = document.body.innerText || '';
  const ohlcMatch = allText.match(/O\s+([\d,.]+)\s+H\s+([\d,.]+)\s+L\s+([\d,.]+)\s+C\s+([\d,.]+)\s+([+\-][\d,.]+)\s+\(([^)]+)\)/);
  if (ohlcMatch) {
    info.open = ohlcMatch[1];
    info.high = ohlcMatch[2];
    info.low = ohlcMatch[3];
    info.close = ohlcMatch[4];
    info.change = ohlcMatch[5];
    if (!info.changePercent) info.changePercent = ohlcMatch[6];
  }

  // 3. Bid/Ask
  const tradeMatch = allText.match(/([\d,.]+)\s+Sell\s+[\d.]+\s+([\d,.]+)\s+Buy/);
  if (tradeMatch) {
    info.bid = tradeMatch[1];
    info.ask = tradeMatch[2];
  }

  // 4. Indicator legend (tree walker)
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
  let node;
  const indicatorCandidates = [];
  while (node = walker.nextNode()) {
    const text = node.textContent.trim();
    if (/^[A-Za-z]/.test(text) && /[\d,.]+/.test(text) && text.length > 5 && text.length < 60) {
      indicatorCandidates.push(text);
    }
  }

  for (const line of indicatorCandidates) {
    const maMatch = line.match(/^(MA|SMA|EMA)\d*\s+([\d,.]+)/i);
    if (maMatch) info.indicators[maMatch[1].toUpperCase()] = maMatch[2];

    const rsiMatch = line.match(/RSI(?:\s*\(\d+\))?\s+([\d.]+)/i);
    if (rsiMatch) info.indicators.RSI = rsiMatch[1];

    const volMatch = line.match(/Vol(?:ume)?\s+([\d.]+[KMB]?)/i);
    if (volMatch) info.indicators.Volume = volMatch[1];
  }

  chrome.runtime.sendMessage({ action: 'pageInfo', data: info });
  return info;
}

extractPageInfo();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractPageInfo') {
    sendResponse(extractPageInfo());
  }
});
