import time, os
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service

OUT="/tmp/shots11"; os.makedirs(OUT, exist_ok=True)
UUID="11111111-1111-1111-1111-111111111111"
BASE="http://localhost:8000"
POPUP=f"moz-extension://{UUID}/src/popup/popup.html"

def drv(addon):
    o=Options(); o.binary_location="/tmp/firefox/firefox"; o.add_argument("-headless")
    o.set_preference("extensions.webextensions.uuids",
                     '{"instagram-focus-filter@example.com":"%s"}'%UUID)
    d=webdriver.Firefox(options=o, service=Service(executable_path="/tmp/geckodriver", log_output="/tmp/gecko.log"))
    d.set_window_size(1180,900)
    if addon:
        d.install_addon("/tmp/exttest", temporary=True); time.sleep(1)
    return d
def shot(d,n): time.sleep(1.6); d.save_screenshot(f"{OUT}/{n}.png"); print("saved",n)

def jsontest(d, tag):
    d.get(BASE+"/jsontest/")
    time.sleep(2.6)  # wait past the 2s delayed parse
    imm=d.find_element("id","immediate").text
    dly=d.find_element("id","delayed").text
    print(f"[{tag}] immediate = {imm}")
    print(f"[{tag}] delayed   = {dly}")
    d.save_screenshot(f"{OUT}/jsontest_{tag}.png")
    return imm,dly

# baseline
d=drv(False)
d.get(BASE+"/"); shot(d,"home_baseline")
jsontest(d,"baseline")
d.quit()

# with extension
d=drv(True)
d.get(BASE+"/"); shot(d,"home_with_ext")
print("HOME articles display:", d.execute_script(
  "return [...document.querySelectorAll('article')].map(a=>getComputedStyle(a).display)"))
print("reels nav:", d.execute_script(
  "var a=document.querySelector('a[href=\"/reels/\"]');return a?getComputedStyle(a).display:'NA'"))
d.get(BASE+"/explore/"); shot(d,"explore_with_ext")
print("explore grid:", d.execute_script(
  "return [...document.querySelectorAll('.grid a')].map(a=>getComputedStyle(a).display)"))
jsontest(d,"with_ext")
d.get(POPUP); shot(d,"popup")
d.quit()
print("DONE")
