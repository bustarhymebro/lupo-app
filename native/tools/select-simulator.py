"""Select an existing iPhone simulator from simctl JSON; never downloads a runtime."""
import json
import subprocess
import argparse
import sys

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--ios', default='18.5', help='Installed runtime to test (default: 18.5).')
args = parser.parse_args()
requested = tuple(int(part) for part in args.ios.split('.'))

data = json.loads(subprocess.check_output(["xcrun", "simctl", "list", "devices", "available", "--json"]))
candidates = []
for runtime, devices in data["devices"].items():
    if ".iOS-" not in runtime:
        continue
    version = tuple(int(part) for part in runtime.split(".iOS-")[1].split("-"))
    if version != requested or version < (17,):
        continue
    for device in devices:
        if device.get("isAvailable") and device["name"].startswith("iPhone"):
            # Keep the combined StoreKit/UI suite on a reproducible installed runtime.
            small = "SE" in device["name"] or device["name"].endswith(" mini")
            candidates.append((small, version, device["name"], device["udid"]))
if not candidates:
    raise SystemExit(f"No available iPhone simulator for iOS {args.ios}. Install that runtime or pass --ios VERSION.")
selected = max(candidates)
print(f"Testing {selected[2]} on iOS {args.ios}", file=sys.stderr)
print(selected[3])
