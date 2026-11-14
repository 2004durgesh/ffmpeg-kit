#!/bin/bash
# build-android-aar <package> [extra android.sh flags...]
#   package: https | full-gpl (the workflow's matrix; the flags below must stay in step with it)
# Builds the repo mounted at /host (its committed HEAD, cloned so the host tree stays clean), copies
# ffmpeg-kit-<package>.aar to /out, and fails if any .so in it isn't 16 KB page-aligned.
set -eo pipefail

PACKAGE="${1:-https}"
shift || true
case "$PACKAGE" in
  https) FLAGS="--enable-openssl --disable-x86 --enable-android-media-codec --enable-android-zlib" ;;
  full-gpl) FLAGS="--full --enable-gpl --disable-lib-srt --disable-lib-gnutls --enable-openssl --disable-x86 --enable-android-media-codec --enable-android-zlib" ;;
  *) echo "Unknown package '$PACKAGE' (expected https or full-gpl)"; exit 1 ;;
esac

[[ -d /host/.git ]] || { echo "Mount the ffmpeg-kit repo at /host (-v \"\$PWD\":/host:ro)"; exit 1; }
[[ -d /out ]] || { echo "Mount an output folder at /out (-v \"\$PWD/dist\":/out)"; exit 1; }

git clone -q /host /src
cd /src
echo "Building ${PACKAGE} from $(git log --oneline -1)"
./android.sh -d $FLAGS "$@" || { tail -120 build.log; exit 1; }

AAR="/out/ffmpeg-kit-${PACKAGE}.aar"
cp prebuilt/bundle-android-aar/ffmpeg-kit/ffmpeg-kit.aar "$AAR"

# Every LOAD segment must be aligned to 16 KB for devices with 16 KB pages (Android 15+)
READELF="$ANDROID_NDK_ROOT/toolchains/llvm/prebuilt/linux-x86_64/bin/llvm-readelf"
CHECK=$(mktemp -d)
unzip -q "$AAR" 'jni/*' -d "$CHECK"
BAD=0
for so in "$CHECK"/jni/*/*.so; do
  ALIGN=$("$READELF" -lW "$so" | awk '/LOAD/{print $NF}' | sort -u | tr '\n' ' ')
  case "$ALIGN" in
    "0x4000 ") ;;
    *) echo "Not 16 KB-aligned: ${so#"$CHECK"/jni/} ($ALIGN)"; BAD=1 ;;
  esac
done
[[ $BAD == 0 ]] || exit 1
echo "All $(ls "$CHECK"/jni/*/*.so | wc -l | tr -d ' ') libraries are 16 KB-aligned"
ls -lh "$AAR"
