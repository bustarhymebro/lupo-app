#!/usr/bin/env python3
"""Check an unsigned device build before proceeding to signing and device QA."""
import argparse
import plistlib
import re
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("app", type=Path, help="Path to the Release-iphoneos Lupo.app bundle")
args = parser.parse_args()

with (args.app / "Info.plist").open("rb") as file:
    info = plistlib.load(file)
sdk = info.get("DTSDKName", "")
version = re.fullmatch(r"iphoneos(\d+)(?:\.\d+)*", sdk)
if not version or int(version[1]) < 26:
    raise SystemExit(f"Expected an iOS 26 or newer device SDK; found {sdk!r}")
if list(args.app.rglob("*.storekit")):
    raise SystemExit("Release bundle contains a local StoreKit configuration")

executable = args.app / info["CFBundleExecutable"]
binary = executable.read_bytes()
for marker in (b"LUPO_UI_TEST_STORE", b"LUPO_UI_TEST_SESSION"):
    if marker in binary:
        raise SystemExit(f"Release executable contains debug control {marker.decode()}")

# check=True propagates missing-tool and inspection errors instead of treating
# them as proof that a forbidden dependency is absent.
libraries = subprocess.check_output(["xcrun", "otool", "-L", str(executable)], text=True)
if "StoreKitTest.framework" in libraries:
    raise SystemExit("Release executable links StoreKitTest")
print(f"Release package checked: {sdk}; no local purchase fixture or debug test controls.")
