require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# ---------------------------------------------------------------------------
# FFmpeg binaries (xcframeworks)
#
# The upstream `ffmpeg-kit-ios-*` pods on CocoaPods trunk are RETIRED, so this
# fork ships its own FFmpeg xcframeworks as GitHub Release assets built by
# .github/workflows/ios-ffmpeg-binaries.yml. Instead of a trunk dependency we
# download the release zip during `pod install` (prepare_command) and vendor the
# extracted *.xcframework bundles. This mirrors the Android side, which resolves
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
# prepare_command is a root-spec attribute that runs once (CocoaPods does not
# allow per-subspec download hooks), so it cannot branch on the chosen subspec.
# The `https` / `full-gpl` subspecs are kept for API parity + deployment target;
# set FFMPEG_KIT_IOS_PACKAGE=full-gpl to actually pull the GPL binaries.
# ---------------------------------------------------------------------------
ffmpeg_kit_repo        = ENV["FFMPEG_KIT_IOS_REPO"]        || "2004durgesh/ffmpeg-kit"
ffmpeg_kit_release_tag = ENV["FFMPEG_KIT_IOS_RELEASE_TAG"] || "ffmpeg-ios-6.0.2"
ffmpeg_kit_package     = ENV["FFMPEG_KIT_IOS_PACKAGE"]     || "https"
ffmpeg_kit_zip_url     = "https://github.com/#{ffmpeg_kit_repo}/releases/download/#{ffmpeg_kit_release_tag}/ffmpeg-kit-ios-#{ffmpeg_kit_package}.xcframework.zip"

# Directory (relative to this podspec) into which prepare_command extracts the
# *.xcframework bundles. It is created on demand and must not be committed.
ffmpeg_kit_vendor_dir  = "ios/FFmpegKitFrameworks"

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

  # Download + extract the FFmpeg xcframework zip from the fork's GitHub Release.
  # The zip stores the *.xcframework bundles at its root (the workflow zips the
  # contents of prebuilt/bundle-apple-xcframework-ios), so they land directly
  # under ffmpeg_kit_vendor_dir and are picked up by ss.vendored_frameworks.
  #
  # TODO(validate): prepare_command is reliably executed for pods fetched from
  # an external source (git/http). For pods added with the Podfile `:path`
  # option -- which is exactly how React Native autolinking wires this module
  # from node_modules -- CocoaPods has historically NOT run prepare_command.
  # If, after `pod install`, ios/FFmpegKitFrameworks is empty (link errors for
  # ffmpegkit / libav*), run the download manually or add an npm `postinstall`
  # that fetches the same zip into ios/FFmpegKitFrameworks before pod install.
  s.prepare_command = <<-CMD
    set -e
    DEST="#{ffmpeg_kit_vendor_dir}"
    URL="#{ffmpeg_kit_zip_url}"
    echo "[ffmpeg-kit-react-native] fetching FFmpeg xcframeworks: ${URL}"
    rm -rf "${DEST}"
    mkdir -p "${DEST}"
    ZIP="$(mktemp -t ffmpeg-kit-ios-xcframework).zip"
    curl -fL --retry 3 --retry-delay 2 -o "${ZIP}" "${URL}"
    unzip -q -o "${ZIP}" -d "${DEST}"
    rm -f "${ZIP}"
    echo "[ffmpeg-kit-react-native] extracted xcframeworks into ${DEST}"
  CMD

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
  if respond_to?(:install_modules_dependencies, true)
    install_modules_dependencies(s)
  else
    s.pod_target_xcconfig = {
        "DEFINES_MODULE" => "YES",
        "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)/boost\"",
        "OTHER_CPLUSPLUS_FLAGS" => "-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DRCT_NEW_ARCH_ENABLED=1",
        "CLANG_CXX_LANGUAGE_STANDARD" => "c++17"
    }
    s.dependency "React-Codegen"
    s.dependency "RCT-Folly"
    s.dependency "RCTRequired"
    s.dependency "RCTTypeSafety"
    s.dependency "ReactCommon/turbomodule/core"
  end

end
