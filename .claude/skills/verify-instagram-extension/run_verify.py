#!/usr/bin/env python3
"""動作確認の撮影スクリプト（雛形）。

実拡張を Firefox に一時アドオンとして読み込み、ローカルのモックページに対して
before/after のスクリーンショットを撮り、display 値で判定する。

前提:
  - /tmp/firefox/firefox        (Mozilla公式バイナリ)
  - /tmp/geckodriver            (実行権限付き)
  - pip install selenium Pillow
  - /tmp/exttest                (拡張のテストコピー。manifest の matches を ["http://localhost/*"] に変更済み)
  - python3 -m http.server 8000 --directory <mock dir>   が起動済み

新機能の確認時は SHOTS の撮影項目・アサーションを足す。
"""
import time, os
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service

OUT = os.environ.get("OUT", "/tmp/shots")
EXT = os.environ.get("EXT", "/tmp/exttest")
FIREFOX = os.environ.get("FIREFOX", "/tmp/firefox/firefox")
GECKO = os.environ.get("GECKO", "/tmp/geckodriver")
BASE = os.environ.get("BASE", "http://localhost:8000")
ADDON_ID = "instagram-focus-filter@example.com"
UUID = "11111111-1111-1111-1111-111111111111"
POPUP = f"moz-extension://{UUID}/src/popup/popup.html"
os.makedirs(OUT, exist_ok=True)


def make_driver(with_addon):
    opts = Options()
    opts.binary_location = FIREFOX
    opts.add_argument("-headless")
    # 内部の moz-extension UUID を固定し、popup ページを直接開けるようにする
    opts.set_preference("extensions.webextensions.uuids", '{"%s":"%s"}' % (ADDON_ID, UUID))
    d = webdriver.Firefox(options=opts, service=Service(executable_path=GECKO, log_output="/tmp/gecko.log"))
    d.set_window_size(1280, 940)
    if with_addon:
        d.install_addon(EXT, temporary=True)  # about:debugging の一時読み込みと同等
        time.sleep(1)
    return d


def shot(d, name):
    time.sleep(1.8)  # content script + MutationObserver/rAF の反映待ち
    p = f"{OUT}/{name}.png"
    (d.save_full_page_screenshot(p) if hasattr(d, "save_full_page_screenshot") else d.save_screenshot(p))
    print("saved", p)


def disp(d, sel):
    return d.execute_script(
        "var e=document.querySelector(arguments[0]);return e?getComputedStyle(e).display:'(none-found)';", sel)


# 1) ベースライン（拡張なし）
d = make_driver(False)
d.get(BASE + "/"); shot(d, "01_home_baseline_no_ext")
d.get(BASE + "/explore/"); shot(d, "02_explore_baseline_no_ext")
d.quit()

# 2) 拡張あり（既定で全ON）
d = make_driver(True)
d.get(BASE + "/"); shot(d, "03_home_with_ext")
print("HOME articles:", d.execute_script(
    "return [...document.querySelectorAll('article')].map(a=>getComputedStyle(a).display)"))
print("reels nav:", disp(d, 'a[href="/reels/"]'))
d.get(BASE + "/explore/"); shot(d, "04_explore_with_ext")
print("explore grid:", d.execute_script(
    "return [...document.querySelectorAll('.grid a')].map(a=>getComputedStyle(a).display)"))
print("search bar:", disp(d, ".searchbar input"))

# 3) popup UI
d.get(POPUP); shot(d, "05_popup_default_on")

# 4) 全体オフ → 復帰確認（実popupを操作して storage に書き込む）
cb = d.find_element("id", "enabled")
if cb.is_selected():
    cb.click()
time.sleep(0.6); shot(d, "06_popup_after_off")
d.get(BASE + "/"); shot(d, "07_home_after_disable")
print("HOME after disable:", d.execute_script(
    "return [...document.querySelectorAll('article')].map(a=>getComputedStyle(a).display)"))
print("reels after disable:", disp(d, 'a[href="/reels/"]'))
d.quit()
print("DONE")
