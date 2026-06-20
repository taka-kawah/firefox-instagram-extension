import time, os
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service

OUT = "/tmp/shots"
os.makedirs(OUT, exist_ok=True)
ADDON_ID = "instagram-focus-filter@example.com"
UUID = "11111111-1111-1111-1111-111111111111"
POPUP = f"moz-extension://{UUID}/src/popup/popup.html"
BASE = "http://localhost:8000"

def make_driver(with_addon):
    opts = Options()
    opts.binary_location = "/tmp/firefox/firefox"
    opts.add_argument("-headless")
    # Pin the internal moz-extension UUID so we can open the popup page directly.
    opts.set_preference("extensions.webextensions.uuids", '{"%s":"%s"}' % (ADDON_ID, UUID))
    service = Service(executable_path="/tmp/geckodriver", log_output="/tmp/gecko.log")
    d = webdriver.Firefox(options=opts, service=service)
    d.set_window_size(1280, 940)
    if with_addon:
        d.install_addon("/tmp/exttest", temporary=True)
        time.sleep(1)
    return d

def shot(d, name):
    time.sleep(1.8)  # let content script + MutationObserver/rAF settle
    p = f"{OUT}/{name}.png"
    d.save_full_page_screenshot(p) if hasattr(d, "save_full_page_screenshot") else d.save_screenshot(p)
    print("saved", p)

# ---- 1) BASELINE: no extension --------------------------------------------
d = make_driver(with_addon=False)
d.get(BASE + "/")
shot(d, "01_home_baseline_no_ext")
d.get(BASE + "/explore/")
shot(d, "02_explore_baseline_no_ext")
d.quit()

# ---- 2) WITH extension (all defaults ON) ----------------------------------
d = make_driver(with_addon=True)
d.get(BASE + "/")
shot(d, "03_home_with_ext")
# verify in DOM which articles are hidden
hidden = d.execute_script(
    "return [...document.querySelectorAll('article')].map(a=>({suggested:a.hasAttribute('data-iff-suggested'), disp:getComputedStyle(a).display}))")
print("HOME articles:", hidden)
reels_disp = d.execute_script(
    "var a=document.querySelector('a[href=\"/reels/\"]'); return a?getComputedStyle(a).display:'(none-found)';")
print("Reels nav link display:", reels_disp)

d.get(BASE + "/explore/")
shot(d, "04_explore_with_ext")
grid = d.execute_script(
    "return [...document.querySelectorAll('.grid a')].map(a=>getComputedStyle(a).display)")
search_disp = d.execute_script(
    "var i=document.querySelector('.searchbar input'); return i?getComputedStyle(i).display:'(none)';")
print("Explore grid displays:", grid)
print("Search bar display:", search_disp)

# ---- 3) Popup UI ----------------------------------------------------------
d.get(POPUP)
shot(d, "05_popup_default_on")

# ---- 4) Toggle master OFF via the real popup, then re-check home ----------
cb = d.find_element("id", "enabled")
if cb.is_selected():
    cb.click()  # writes storage.local enabled=false (popup.js)
time.sleep(0.6)
shot(d, "06_popup_after_off")
d.get(BASE + "/")
shot(d, "07_home_after_disable")
after = d.execute_script(
    "return [...document.querySelectorAll('article')].map(a=>getComputedStyle(a).display)")
reels_after = d.execute_script(
    "var a=document.querySelector('a[href=\"/reels/\"]'); return a?getComputedStyle(a).display:'(none-found)';")
print("HOME after disable, article displays:", after)
print("Reels nav after disable:", reels_after)
d.quit()
print("DONE")
