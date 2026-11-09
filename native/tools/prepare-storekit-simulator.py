"""Prepare an installed modern StoreKit simulator on the optional CI runner."""
import json
import os
import subprocess

def simctl(*args):
    return subprocess.check_output(["xcrun", "simctl", *args], text=True)

requested = os.environ.get("TEST_IOS_VERSION", "26.4").split(".")
runtimes = [r for r in json.loads(simctl("list", "runtimes", "--json"))["runtimes"]
            if r.get("isAvailable") and r["version"].split(".")[:len(requested)] == requested]
if not runtimes:
    raise SystemExit(f"The requested installed iOS {'.'.join(requested)} runtime is unavailable")
runtime = max(runtimes, key=lambda r: tuple(map(int, r["version"].split("."))))
devices = json.loads(simctl("list", "devices", "available", "--json"))["devices"]
if not any(d["name"].startswith("iPhone") for d in devices.get(runtime["identifier"], [])):
    types = json.loads(simctl("list", "devicetypes", "--json"))["devicetypes"]
    device_type = next((d for d in types if d["name"] == "iPhone 17"), None)
    if device_type is None:
        raise SystemExit("Xcode does not contain the expected iPhone 17 device type")
    print(simctl("create", "iPhone 17 — Lupo StoreKit", device_type["identifier"], runtime["identifier"]))
print(f"StoreKit diagnostic runtime ready: {runtime['version']}")
