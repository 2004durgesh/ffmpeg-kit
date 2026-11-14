require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# ---------------------------------------------------------------------------
# FFmpeg binaries (xcframeworks)
#
# The upstream `ffmpeg-kit-ios-*` pods on CocoaPods trunk are RETIRED, so this
# fork ships its own FFmpeg xcframeworks as GitHub Release assets built by
# .github/workflows/ios-ffmpeg-binaries.yml. Instead of a trunk dependency we
# download the release zip when `pod install` evaluates this podspec and vendor
# the extracted *.xcframework bundles. This mirrors the Android side, which resolves
# the AAR from the same release via an ivy repo (react-native/android/build.gradle).
#
# Overridable via environment variables (analogous to the Android Gradle props
# ffmpegKitPackage / ffmpegKitReleaseTag):
#   FFMPEG_KIT_IOS_PACKAGE      variant to download   (default "https"; e.g. "full-gpl")
#   FFMPEG_KIT_IOS_RELEASE_TAG  release tag to fetch  (default "ffmpeg-ios-6.0.2")
#   FFMPEG_KIT_IOS_REPO         owner/repo to fetch from (default "2004durgesh/ffmpeg-kit")
#
# Resolves to:
#   https://github.com/<repo>/releases/download/<tag>/ffmpeg-kit-ios-<package>.xcframework.zip
#
# NOTE: the variant is selected by FFMPEG_KIT_IOS_PACKAGE, not by the subspec.
# The download runs once per podspec evaluation, before any subspec is chosen,
# so it cannot branch on the chosen subspec.
# The `https` / `full-gpl` subspecs are kept for API parity + deployment target;
# set FFMPEG_KIT_IOS_PACKAGE=full-gpl to actually pull the GPL binaries.
# ---------------------------------------------------------------------------
ffmpeg_kit_repo        = ENV["FFMPEG_KIT_IOS_REPO"]        || "2004durgesh/ffmpeg-kit"
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
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platform          = :ios
  s.requires_arc      = true
  s.static_framework  = true

  # The module is ObjC++ (.mm) for the TurboModule glue, which compiles the
  # ffmpegkit framework headers under stricter C++ rules; suppress the enum
  # narrowing diagnostic those headers trip (harmless, C-only enums).
  s.compiler_flags = '-Wno-c++11-narrowing'

  s.source       = { :git => "https://github.com/2004durgesh/ffmpeg-kit.git", :tag => "react.native.v#{s.version}" }

  s.default_subspec   = 'https'

  s.dependency "React-Core"

  # Only the variants actually built by ios-ffmpeg-binaries.yml are exposed.
  # The retired upstream subspecs (min*, audio*, video*, full* and every *-lts)
  # are dropped: this fork is New-Architecture-only, so the SDK 10 `-lts`
  # deployment targets no longer apply.
  s.subspec 'https' do |ss|
      ss.source_files          = 'ios/FFmpegKitReactNativeModule.{h,mm}'
      ss.vendored_frameworks   = "#{ffmpeg_kit_vendor_dir}/*.xcframework"
      ss.ios.deployment_target = '12.1'
  end

  s.subspec 'full-gpl' do |ss|
      ss.source_files          = 'ios/FFmpegKitReactNativeModule.{h,mm}'
      ss.vendored_frameworks   = "#{ffmpeg_kit_vendor_dir}/*.xcframework"
      ss.ios.deployment_target = '12.1'
  end

  # https://github.com/facebook/react-native/blob/main/packages/react-native/scripts/cocoapods/new_architecture.rb
  # Reported by getBinaryVersion(), so the app can tell which frameworks it got
  release_tag_define = "$(inherited) FFMPEG_KIT_RELEASE_TAG=#{ffmpeg_kit_release_tag}"
  if respond_to?(:install_modules_dependencies, true)
    s.pod_target_xcconfig = { "GCC_PREPROCESSOR_DEFINITIONS" => release_tag_define }
    install_modules_dependencies(s)
  else
    s.pod_target_xcconfig = {
        "DEFINES_MODULE" => "YES",
        "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)/boost\"",
        "OTHER_CPLUSPLUS_FLAGS" => "-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DRCT_NEW_ARCH_ENABLED=1",
        "CLANG_CXX_LANGUAGE_STANDARD" => "c++17",
        "GCC_PREPROCESSOR_DEFINITIONS" => release_tag_define
    }
    s.dependency "React-Codegen"
    s.dependency "RCT-Folly"
    s.dependency "RCTRequired"
    s.dependency "RCTTypeSafety"
    s.dependency "ReactCommon/turbomodule/core"
  end

end
