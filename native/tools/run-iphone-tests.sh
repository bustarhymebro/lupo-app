#!/bin/bash
set -euo pipefail

simulator_id=$(python3 tools/select-simulator.py)
# Boot before starting the test runner so logs survive Xcode's simulator shutdown.
xcrun simctl bootstatus "$simulator_id" -b
xcrun simctl spawn "$simulator_id" log stream --style compact --level debug \
  --predicate 'subsystem == "com.chlebholdings.lupo" OR subsystem CONTAINS[c] "StoreKit" OR ((process == "storekitd" OR process == "appstored") AND subsystem == "com.apple.AppleMediaServices")' \
  > StoreKitDiagnostics.log 2>&1 &
diagnostic_pid=$!
trap 'kill "$diagnostic_pid" 2>/dev/null || true' EXIT

set -- -project Lupo.xcodeproj -scheme LupoStoreKitTests -configuration Debug \
  -destination "platform=iOS Simulator,id=$simulator_id" \
  -derivedDataPath UITestBuild -parallel-testing-enabled NO CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=-
# SKTestSession needs an installed target when it clears transactions and sends
# configuration updates. XCUITest otherwise installs the app on its first launch,
# after the StoreKit test's prepare() has already configured the session.
xcodebuild "$@" build-for-testing
xcrun simctl install "$simulator_id" UITestBuild/Build/Products/Debug-iphonesimulator/Lupo.app
if [ -n "${TEST_FILTER:-}" ]; then set -- "$@" "-only-testing:$TEST_FILTER"; fi
xcodebuild "$@" -resultBundlePath TestResults.xcresult test-without-building
