"""Select an existing iPhone simulator from simctl JSON; never downloads a runtime."""
import json
import subprocess

data = json.loads(subprocess.check_output(["xcrun", "simctl", "list", "devices", "available", "--json"]))
candidates = []
for runtime, devices in data["devices"].items():
    if ".iOS-" not in runtime:
        continue
    version = tuple(int(part) for part in runtime.split(".iOS-")[1].split("-"))
    if version < (17,):
        continue
    for device in devices:
        if device.get("isAvailable") and device["name"].startswith("iPhone"):
            # Prefer a smaller phone when the runner has one, then the newest runtime.
            small = "SE" in device["name"] or device["name"].endswith(" mini")
            candidates.append((small, version, device["name"], device["udid"]))
if not candidates:
    raise SystemExit("No available iPhone simulator. Install an iOS simulator runtime in Xcode first.")
print(max(candidates)[3])
