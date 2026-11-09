#!/bin/bash
set -euo pipefail

simulator_id=$(python3 tools/select-simulator.py)
# Boot before starting the test runner so logs survive Xcode's simulator shutdown.
xcrun simctl bootstatus "$simulator_id" -b
xcrun simctl spawn "$simulator_id" log stream --style compact --level debug \
  --predicate 'process == "Lupo" OR process == "storekitd" OR process == "appstored" OR subsystem CONTAINS[c] "StoreKit"' \
  > StoreKitDiagnostics.log 2>&1 &
diagnostic_pid=$!
trap 'kill "$diagnostic_pid" 2>/dev/null || true' EXIT

set -- -project Lupo.xcodeproj -scheme LupoStoreKitTests -configuration Debug \
  -destination "platform=iOS Simulator,id=$simulator_id" \
  -parallel-testing-enabled NO -resultBundlePath TestResults.xcresult CODE_SIGNING_ALLOWED=NO
if [ -n "${TEST_FILTER:-}" ]; then set -- "$@" "-only-testing:$TEST_FILTER"; fi
xcodebuild "$@" test
