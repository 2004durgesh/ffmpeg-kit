# PowerShell script to open an interactive shell using persistent SDK volume
# Run docker-setup-sdk.ps1 first to create the volume

$WORKSPACE_PATH = $PSScriptRoot

# Check if SDK volume exists
$volumeExists = docker volume ls -q -f name=android-sdk-volume
if (-not $volumeExists) {
    Write-Host "Android SDK volume not found!" -ForegroundColor Red
    Write-Host "Please run: .\docker-setup-sdk.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "Starting interactive Docker shell..." -ForegroundColor Green
Write-Host "You can run build commands manually inside the container" -ForegroundColor Cyan
Write-Host "Example: ./android.sh --enable-gpl --enable-x264 --enable-x265" -ForegroundColor Yellow

docker run --rm -it `
    -v "${WORKSPACE_PATH}:/workspace" `
    -v "android-sdk-volume:/opt/android-sdk:ro" `
    -w /workspace `
    ffmpeg-kit-builder `
    bash -c "echo 'Converting line endings...'; find . -type f \( -name '*.sh' -o -name 'configure' -o -name 'config.*' -o -name '*.ac' -o -name '*.am' -o -name 'autogen.sh' -o -name 'Makefile*' \) ! -path './.git/*' -exec dos2unix {} \; 2>/dev/null; echo 'Ready. You can now run build commands.'; exec /bin/bash"
