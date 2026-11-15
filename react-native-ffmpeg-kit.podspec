require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# ---------------------------------------------------------------------------
# FFmpeg binaries (xcframeworks)
#
# The upstream `ffmpeg-kit-ios-*` pods on CocoaPods trunk are RETIRED, so this
# fork ships its own FFmpeg xcframeworks as GitHub Release assets built by
# .github/workflows/ios-ffmpeg-binaries.yml. Instead of a trunk dependency we
# download the release zip when `pod install` evaluates this podspec and vendor
# the extracted *.xcframework bundles. This mirrors the Android side, which downloads
# the AAR from the same release (android/build.gradle).
#
# Overridable via environment variables (analogous to the Android Gradle props
# ffmpegKitPackage / ffmpegKitReleaseTag):
#   FFMPEG_KIT_IOS_PACKAGE      variant to download   (default "https"; e.g. "full-gpl")
#   FFMPEG_KIT_IOS_RELEASE_TAG  release tag to fetch  (default "ffmpeg-ios-6.0.2")
#   FFMPEG_KIT_IOS_REPO         owner/repo to fetch from (default "2004durgesh/react-native-ffmpeg-kit")
#
# Resolves to:
#   https://github.com/<repo>/releases/download/<tag>/ffmpeg-kit-ios-<package>.xcframework.zip
#
# The variant is selected by FFMPEG_KIT_IOS_PACKAGE (e.g. full-gpl).
# ---------------------------------------------------------------------------
ffmpeg_kit_repo        = ENV["FFMPEG_KIT_IOS_REPO"]        || "2004durgesh/react-native-ffmpeg-kit"
ffmpeg_kit_release_tag = ENV["FFMPEG_KIT_IOS_RELEASE_TAG"] || "ffmpeg-ios-6.0.2"
ffmpeg_kit_package     = ENV["FFMPEG_KIT_IOS_PACKAGE"]     || "https"
ffmpeg_kit_zip_url     = "https://github.com/#{ffmpeg_kit_repo}/releases/download/#{ffmpeg_kit_release_tag}/ffmpeg-kit-ios-#{ffmpeg_kit_package}.xcframework.zip"

# Directory (relative to this podspec) into which the *.xcframework bundles are
# extracted. It is created on demand and must not be committed or published.
ffmpeg_kit_vendor_dir  = "ios/FFmpegKitFrameworks"

# CocoaPods never runs prepare_command for :path pods -- which is how React
# Native autolinking adds this module -- so fetch while the podspec is evaluated.
# The zip is re-downloaded only when the URL changes (tracked by a stamp file).
ffmpeg_kit_fetch_script = <<~'SH'
  set -e
  DEST="$1"
  URL="$2"
  STAMP="${DEST}/.source-url"
  if [ "$(cat "${STAMP}" 2>/dev/null)" != "${URL}" ]; then
    echo "[react-native-ffmpeg-kit] fetching FFmpeg xcframeworks: ${URL}"
    rm -rf "${DEST}"
    mkdir -p "${DEST}"
    ZIP="$(mktemp -t ffmpeg-kit-ios-xcframework).zip"
    curl -fL --retry 3 --retry-delay 2 -o "${ZIP}" "${URL}"
    unzip -q -o "${ZIP}" -d "${DEST}"
    rm -f "${ZIP}"
    printf '%s' "${URL}" > "${STAMP}"
  fi
  # The release zip drops framework symlinks, so versioned slices (maccatalyst)
  # only expose Versions/A/<name>. CocoaPods reads the flat <name>.framework/<name>,
  # finds nothing, misclassifies the slice as static and aborts with "contains
  # both static and dynamic frameworks". Rebuild the standard symlinks.
  find "${DEST}" -type d -name '*.framework' | while read -r fw; do
    name="$(basename "${fw}" .framework)"
    [ -d "${fw}/Versions/A" ] || continue
    ( cd "${fw}/Versions" && ln -sfn A Current )
    ( cd "${fw}" && ln -sfn "Versions/Current/${name}" "${name}" )
    for item in Headers Modules Resources; do
      if [ -e "${fw}/Versions/A/${item}" ]; then
        ( cd "${fw}" && ln -sfn "Versions/Current/${item}" "${item}" )
      fi
    done
  done
SH

unless system("bash", "-c", ffmpeg_kit_fetch_script, "ffmpeg-kit",
              File.join(__dir__, ffmpeg_kit_vendor_dir), ffmpeg_kit_zip_url)
  raise "[react-native-ffmpeg-kit] failed to fetch FFmpeg xcframeworks from #{ffmpeg_kit_zip_url}"
end

Pod::Spec.new do |s|
  s.name         = package["name"]
  # Swift/C++ module name; must match "iosModuleName" in nitro.json.
  s.module_name  = "NitroFFmpegKit"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/2004durgesh/react-native-ffmpeg-kit.git", :tag => "v#{s.version}" }

  # Not recursive under ios/: ios/FFmpegKitFrameworks holds FFmpeg's headers, and
  # picking them up (libavutil/time.h) shadows system headers like <time.h>.
  # Never glob from the package root either; that recurses into example/.
  s.source_files = [
    "ios/*.{h,m,mm,swift}",
    "cpp/*.{hpp,cpp}",
  ]

  s.vendored_frameworks = "#{ffmpeg_kit_vendor_dir}/*.xcframework"

  # The ffmpegkit headers trip this under C++ (C-only enums); harmless. Swift
  # imports them in C++ interop mode too, so its Clang importer needs it as well.
  s.compiler_flags = "-Wno-c++11-narrowing"

  s.pod_target_xcconfig = {
    # Reported by getBinaryVersion(), so the app can tell which frameworks it got.
    "GCC_PREPROCESSOR_DEFINITIONS" => "$(inherited) FFMPEG_KIT_RELEASE_TAG=#{ffmpeg_kit_release_tag}",
    "OTHER_SWIFT_FLAGS" => "$(inherited) -Xcc -Wno-c++11-narrowing",
  }

  s.dependency "React-jsi"
  s.dependency "React-callinvoker"

  load "nitrogen/generated/ios/NitroFFmpegKit+autolinking.rb"
  add_nitrogen_files(s)

  install_modules_dependencies(s)
end
