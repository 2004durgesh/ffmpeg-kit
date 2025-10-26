# PowerShell script to build ffmpeg-kit using Docker with persistent SDK volume
# Run docker-setup-sdk.ps1 first to create the volume

$WORKSPACE_PATH = $PSScriptRoot

Write-Host "Building Docker image..." -ForegroundColor Green
docker build -t ffmpeg-kit-builder .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build Docker image" -ForegroundColor Red
    exit 1
}

# Check if SDK volume exists
$volumeExists = docker volume ls -q -f name=android-sdk-volume
if (-not $volumeExists) {
    Write-Host "`nAndroid SDK volume not found!" -ForegroundColor Red
    Write-Host "Please run: .\docker-setup-sdk.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "`nRunning build in Docker container..." -ForegroundColor Green
Write-Host "Workspace: $WORKSPACE_PATH" -ForegroundColor Cyan

# Run the build in Docker with mounted volumes
docker run --rm -it `
    -v "${WORKSPACE_PATH}:/workspace" `
    -v "android-sdk-volume:/opt/android-sdk:ro" `
    -w /workspace `
    ffmpeg-kit-builder `
    bash -c "echo 'Converting line endings...'; find . -type f \( -name '*.sh' -o -name 'configure' -o -name 'config.*' -o -name '*.ac' -o -name '*.am' -o -name 'autogen.sh' -o -name 'Makefile*' \) ! -path './.git/*' -exec dos2unix {} \; 2>/dev/null; echo 'Starting build...'; ./android.sh --enable-gpl --enable-x264 --enable-x265 --disable-lib-fribidi --disable-lib-fontconfig --disable-lib-libass"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nBuild completed successfully!" -ForegroundColor Green
    Write-Host "Build artifacts are in: $WORKSPACE_PATH\prebuilt" -ForegroundColor Cyan
} else {
    Write-Host "`nBuild failed. Check build.log for details." -ForegroundColor Red
}
