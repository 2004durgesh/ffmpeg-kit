# PowerShell script to set up Android SDK/NDK once in a Docker volume

$ANDROID_SDK_PATH = "C:\Users\Durgesh\AppData\Local\Android\Sdk"

Write-Host "Creating persistent Android SDK volume..." -ForegroundColor Green

# Create a volume for the Android SDK
docker volume create android-sdk-volume

Write-Host "`nCopying Android SDK/NDK to volume (this may take a few minutes)..." -ForegroundColor Yellow

# Copy NDK and CMake to the volume
docker run --rm `
    -v "${ANDROID_SDK_PATH}:/source:ro" `
    -v "android-sdk-volume:/opt/android-sdk" `
    ubuntu:22.04 `
    bash -c "apt-get update > /dev/null && apt-get install -y rsync > /dev/null 2>&1 && echo 'Creating directories...' && mkdir -p /opt/android-sdk/ndk /opt/android-sdk/cmake && echo 'Copying NDK...' && rsync -a /source/ndk/27.1.12297006/ /opt/android-sdk/ndk/27.1.12297006/ && echo 'Copying CMake...' && rsync -a /source/cmake/ /opt/android-sdk/cmake/ && echo 'Creating symlink for toolchain...' && if [ -d '/opt/android-sdk/ndk/27.1.12297006/toolchains/llvm/prebuilt/windows-x86_64' ]; then ln -sf windows-x86_64 /opt/android-sdk/ndk/27.1.12297006/toolchains/llvm/prebuilt/linux-x86_64; fi && echo 'Done!'"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nAndroid SDK volume created successfully!" -ForegroundColor Green
    Write-Host "You can now use docker-build-fast.ps1 for faster builds" -ForegroundColor Cyan
} else {
    Write-Host "`nFailed to create Android SDK volume" -ForegroundColor Red
    exit 1
}
