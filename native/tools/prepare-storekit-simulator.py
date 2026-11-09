"""Prepare the iOS 26.6 StoreKit diagnostic runtime on the optional CI runner."""
import json
import subprocess

def simctl(*args):
    return subprocess.check_output(["xcrun", "simctl", *args], text=True)

subprocess.run(["xcodebuild", "-downloadPlatform", "iOS", "-buildVersion", "26.6"], check=True)
runtimes = [r for r in json.loads(simctl("list", "runtimes", "--json"))["runtimes"]
            if r.get("isAvailable") and r["version"].split(".")[:2] == ["26", "6"]]
if not runtimes:
    raise SystemExit("The requested iOS 26.6 runtime is not available after download")
runtime = max(runtimes, key=lambda r: tuple(map(int, r["version"].split("."))))
devices = json.loads(simctl("list", "devices", "available", "--json"))["devices"]
if not any(d["name"].startswith("iPhone") for d in devices.get(runtime["identifier"], [])):
    types = json.loads(simctl("list", "devicetypes", "--json"))["devicetypes"]
    device_type = next((d for d in types if d["name"] == "iPhone 17"), None)
    if device_type is None:
        raise SystemExit("Xcode does not contain the expected iPhone 17 device type")
    print(simctl("create", "iPhone 17 — Lupo StoreKit", device_type["identifier"], runtime["identifier"]))
print(f"StoreKit diagnostic runtime ready: {runtime['version']}")
