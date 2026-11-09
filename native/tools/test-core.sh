#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
test_dir=$(mktemp -d)
trap 'rm -rf "$test_dir"' EXIT
python3 - "$test_dir/main.swift" <<'PY'
import re, sys
source = open('Tests/LupoCoreTests/GameTests.swift').read()
tests = re.findall(r'func (test\w+)\(\)( throws)?', source)
with open(sys.argv[1], 'w') as f:
    f.write('import Foundation\nlet suite = GameTests()\n')
    for test, throwing in tests:
        f.write(f'{"try " if throwing else ""}suite.{test}()\nprint("PASS {test}")\n')
    f.write(f'print("{len(tests)} regression tests passed")\n')
PY
swiftc -D DIRECT_TEST Sources/LupoCore/*.swift Tests/LupoCoreTests/GameTests.swift "$test_dir/main.swift" -o "$test_dir/test-core"
"$test_dir/test-core"
