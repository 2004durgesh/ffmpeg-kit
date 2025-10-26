#!/bin/bash

echo "Testing NDK toolchain..."
echo ""

# Check if NDK directory exists
echo "1. Checking NDK directory:"
if [ -d "/opt/android-sdk/ndk/27.1.12297006" ]; then
    echo "   ✓ NDK directory exists: /opt/android-sdk/ndk/27.1.12297006"
else
    echo "   ✗ NDK directory NOT found: /opt/android-sdk/ndk/27.1.12297006"
    exit 1
fi

# Check if toolchain exists
echo ""
echo "2. Checking toolchain:"
TOOLCHAIN_DIR="/opt/android-sdk/ndk/27.1.12297006/toolchains/llvm/prebuilt/linux-x86_64"
if [ -d "$TOOLCHAIN_DIR" ]; then
    echo "   ✓ Toolchain directory exists: $TOOLCHAIN_DIR"
else
    echo "   ✗ Toolchain directory NOT found: $TOOLCHAIN_DIR"
    exit 1
fi

# Check if compiler exists
echo ""
echo "3. Checking compiler:"
COMPILER="$TOOLCHAIN_DIR/bin/armv7a-linux-androideabi23-clang"
if [ -f "$COMPILER" ]; then
    echo "   ✓ Compiler exists: $COMPILER"
    ls -lh "$COMPILER"
else
    echo "   ✗ Compiler NOT found: $COMPILER"
    exit 1
fi

# Test compiler execution
echo ""
echo "4. Testing compiler execution:"
if "$COMPILER" --version 2>&1 | head -3; then
    echo "   ✓ Compiler executes successfully"
else
    echo "   ✗ Compiler failed to execute"
    exit 1
fi

# Create test C file
echo ""
echo "5. Testing compilation:"
cat > /tmp/test.c << 'EOF'
#include <stdio.h>
int main() {
    printf("Hello from Android NDK!\n");
    return 0;
}
EOF

if "$COMPILER" /tmp/test.c -o /tmp/test 2>&1; then
    echo "   ✓ Test compilation successful"
    rm -f /tmp/test.c /tmp/test
else
    echo "   ✗ Test compilation failed"
    exit 1
fi

echo ""
echo "All tests passed! NDK toolchain is working correctly."
