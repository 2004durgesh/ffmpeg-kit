cmake_minimum_required(VERSION 3.13)
project(NitroFFmpegKit)

set(PACKAGE_NAME NitroFFmpegKit)
set(CMAKE_CXX_STANDARD 20)

# Not "ffmpegkit": that name belongs to the AAR's libffmpegkit.so.
add_library(${PACKAGE_NAME} SHARED
  src/main/cpp/cpp-adapter.cpp
  src/main/cpp/FFmpegKitPlatformAndroid.cpp
  ../cpp/FFmpegCallbacks.cpp
  ../cpp/FFmpegKitRuntime.cpp
  ../cpp/HybridFFmpegKitCore.cpp
  ../cpp/HybridFFmpegKitSession.cpp
  ../cpp/PipeWriter.cpp
  ../cpp/PlatformServices.cpp
)

include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/NitroFFmpegKit+autolinking.cmake)

include_directories("src/main/cpp" "../cpp")

# Release tag of the downloaded AAR, reported by getBinaryVersion().
target_compile_definitions(${PACKAGE_NAME} PRIVATE "FFMPEG_KIT_RELEASE_TAG=${FFMPEG_KIT_RELEASE_TAG}")

# FFmpeg itself is not linked: libffmpegkit is loaded by ffmpeg-kit's Java side
# and resolved with dlsym (see FFmpegKitPlatformAndroid.cpp).
find_library(LOG_LIB log)
target_link_libraries(${PACKAGE_NAME} ${LOG_LIB} android)

# Only JNI_OnLoad needs to be visible; dead code is dropped.
target_compile_options(${PACKAGE_NAME} PRIVATE
  -fvisibility=hidden
  -fvisibility-inlines-hidden
  -ffunction-sections
  -fdata-sections
)
target_link_options(${PACKAGE_NAME} PRIVATE
  -Wl,--gc-sections
  # 16 KB page devices (Android 15+), same as the FFmpeg binaries
  -Wl,-z,max-page-size=16384
)
