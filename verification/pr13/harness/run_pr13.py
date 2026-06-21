import time, os
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service

OUT="/tmp/shots13"; os.makedirs(OUT, exist_ok=True)
UUID="11111111-1111-1111-1111-111111111111"; BASE="http://localhost:8000"
POPUP=f"moz-extension://{UUID}/src/popup/popup.html"

def drv(addon):
    o=Options(); o.binary_location="/tmp/firefox/firefox"; o.add_argument("-headless")
    o.set_preference("extensions.webextensions.uuids",'{"instagram-focus-filter@example.com":"%s"}'%UUID)
    d=webdriver.Firefox(options=o, service=Service(executable_path="/tmp/geckodriver", log_output="/tmp/g.log"))
    d.set_window_size(1180,1000)
    if addon: d.install_addon("/tmp/exttest", temporary=True); time.sleep(1)
    return d
def shot(d,n): time.sleep(1.6); d.save_screenshot(f"{OUT}/{n}.png"); print("saved",n)
def homestate(d):
    return d.execute_script("""
      function disp(id){var e=document.getElementById(id);return e?getComputedStyle(e).display:'NA';}
      return {sponsored:disp('post-sponsored'),
              articles:[...document.querySelectorAll('article')].map(a=>getComputedStyle(a).display)};""")

# baseline (no ext)
d=drv(False); d.get(BASE+"/"); shot(d,"home_baseline")
print("baseline home:", homestate(d)); d.quit()

# with ext, default (hideSponsored OFF)
d=drv(True); d.get(BASE+"/"); shot(d,"home_default")
print("default(ext) home:", homestate(d))
d.get(BASE+"/jsontest/"); time.sleep(2.6)
print("default(ext) jsonB delayed:", d.find_element("id","delayed").text)
d.get(POPUP); shot(d,"popup")

# turn ON hideSponsored via popup
cb=d.find_element("id","hideSponsored")
if not cb.is_selected(): cb.click()
time.sleep(0.8)
print("hideSponsored now:", d.find_element("id","hideSponsored").is_selected())
d.get(BASE+"/"); shot(d,"home_sponsored_on")
print("sponsoredON home:", homestate(d))
d.get(BASE+"/jsontest/"); time.sleep(2.6)
print("sponsoredON jsonB delayed:", d.find_element("id","delayed").text)
d.quit(); print("DONE")
