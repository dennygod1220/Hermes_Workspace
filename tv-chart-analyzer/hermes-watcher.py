#!/usr/bin/env python3
"""
Trading Screenshot Watcher
監控截圖目錄，新檔案出現時顯示摘要供 Hermes Agent 使用。

使用方式:
  python3 hermes-watcher.py [--latest]   # 顯示最新一筆 (預設)
  python3 hermes-watcher.py --watch      # 監聽模式
  python3 hermes-watcher.py --import     # 從 Downloads 匯入 tv_* 截圖至 screenshots/
"""

import json
import os
import sys
import time
import shutil
from pathlib import Path

SCREENSHOT_DIR = Path(os.environ.get(
    'TRADING_SCREENSHOTS_DIR',
    '/mnt/c/Users/denny/Downloads/Hermes_Workspace/tv-chart-analyzer/screenshots'
))
DOWNLOADS_DIR = Path('/mnt/c/Users/denny/Downloads')


def get_latest_pair():
    # First check screenshots/ directory
    pngs = sorted(SCREENSHOT_DIR.glob('*.png'), key=os.path.getmtime, reverse=True)
    if not pngs:
        # Fallback: check Downloads for tv_* files
        pngs = sorted(DOWNLOADS_DIR.glob('tv_*.png'), key=os.path.getmtime, reverse=True)

    if not pngs:
        return None, None

    latest_png = pngs[0]
    # Look for matching JSON
    json_candidates = [
        latest_png.with_suffix('.json'),
        DOWNLOADS_DIR / (latest_png.stem + '.json'),
        SCREENSHOT_DIR / (latest_png.stem + '.json'),
    ]
    for jp in json_candidates:
        if jp.exists():
            return latest_png, jp

    return latest_png, None


def load_metadata(json_path):
    with open(json_path) as f:
        return json.load(f)


def format_summary(meta):
    trade = meta.get('trade', {})
    ind = meta.get('indicators', {})
    ind_labels = ' '.join(k.upper() for k, v in ind.items() if v)
    lines = [
        f"📊 {meta.get('symbol', '--')} @ {meta.get('price', '--')}",
        f"   方向: {'📈 做多' if trade.get('direction') == 'long' else '📉 做空'}",
        f"   進場: {trade.get('entryPrice', '--')}",
        f"   停損: {trade.get('stopLoss', '--')}  目標: {trade.get('takeProfit', '--')}",
        f"   備註: {trade.get('notes', '(無)')}",
        f"   OHLC: O={meta.get('open')} H={meta.get('high')} L={meta.get('low')} C={meta.get('close')}",
    ]
    if ind_labels:
        lines.append(f"   指標: {ind_labels}")
    if meta.get('changePercent'):
        lines.append(f"   漲跌: {meta.get('change')} ({meta.get('changePercent')})")
    return '\n'.join(lines)


def import_from_downloads():
    """Move tv_* files from Downloads/ to screenshots/ directory"""
    tv_pngs = sorted(DOWNLOADS_DIR.glob('tv_*.png'), key=os.path.getmtime)
    if not tv_pngs:
        print("❌ Downloads 中沒有 tv_* 截圖")
        return

    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    count = 0
    for png in tv_pngs:
        dst_png = SCREENSHOT_DIR / png.name
        if dst_png.exists():
            print(f"⏭ 已存在: {png.name}")
            continue
        shutil.move(str(png), str(dst_png))
        print(f"✅ 已匯入: {png.name}")

        # Also move matching JSON if exists
        json_src = png.with_suffix('.json')
        if json_src.exists():
            dst_json = SCREENSHOT_DIR / json_src.name
            shutil.move(str(json_src), str(dst_json))
            print(f"✅ 已匯入: {json_src.name}")
        count += 1

    print(f"\n📦 共匯入 {count} 組截圖到 {SCREENSHOT_DIR}")


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--latest'

    if mode == '--import':
        import_from_downloads()
        return

    if mode == '--watch':
        print(f"👀 監控 {SCREENSHOT_DIR} ... (按 Ctrl+C 停止)")
        seen = set(os.listdir(SCREENSHOT_DIR))
        try:
            while True:
                current = set(os.listdir(SCREENSHOT_DIR))
                new_files = current - seen
                if new_files:
                    for f in sorted(new_files):
                        if f.endswith('.png'):
                            png_path = SCREENSHOT_DIR / f
                            json_path = png_path.with_suffix('.json')
                            print(f"\n📸 新截圖: {f}")
                            if json_path.exists():
                                meta = load_metadata(json_path)
                                print(format_summary(meta))
                            print(f"\n💡 PNG: {png_path}")
                seen = current
                time.sleep(2)
        except KeyboardInterrupt:
            print("\n👋 停止監控")
        return

    # --latest mode (default)
    png, json_path = get_latest_pair()
    if not png:
        print("❌ 沒有找到截圖")
        print("💡 先用 Extension 截圖，或執行: python3 hermes-watcher.py --import")
        sys.exit(1)

    print(f"📸 最新截圖: {png.name}")
    if json_path:
        meta = load_metadata(json_path)
        print(format_summary(meta))
    print(f"\n💡 PNG: {png}")
    if json_path:
        print(f"💡 JSON: {json_path}")


if __name__ == '__main__':
    main()
