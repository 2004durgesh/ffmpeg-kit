//
// PipeWriter.cpp
//

#include "PipeWriter.hpp"

#include <cerrno>
#include <csignal>
#include <fcntl.h>
#include <pthread.h>
#include <unistd.h>
#include <vector>

namespace margelo::nitro::ffmpegkit {

namespace {

  /** Closes a file descriptor when it goes out of scope. */
  class FileDescriptor {
  public:
    explicit FileDescriptor(int fd) noexcept : _fd(fd) {}
    ~FileDescriptor() {
      if (_fd >= 0) {
        ::close(_fd);
      }
    }
    FileDescriptor(const FileDescriptor&) = delete;
    FileDescriptor& operator=(const FileDescriptor&) = delete;

    int get() const noexcept {
      return _fd;
    }
    bool valid() const noexcept {
      return _fd >= 0;
    }

  private:
    int _fd;
  };

  /** Writes all of `size` bytes, retrying on EINTR and short writes. */
  int writeAll(int fd, const char* data, size_t size) {
    size_t written = 0;
    while (written < size) {
      const ssize_t n = ::write(fd, data + written, size - written);
      if (n < 0) {
        if (errno == EINTR) {
          continue;
        }
        return errno;
      }
      written += static_cast<size_t>(n);
    }
    return 0;
  }

} // namespace

int copyFileToPipe(const std::string& inputPath, const std::string& pipePath) {
  sigset_t sigpipe;
  sigemptyset(&sigpipe);
  sigaddset(&sigpipe, SIGPIPE);
  pthread_sigmask(SIG_BLOCK, &sigpipe, nullptr);

  const FileDescriptor input(::open(inputPath.c_str(), O_RDONLY));
  if (!input.valid()) {
    return errno;
  }
  // Blocks until FFmpeg opens the pipe for reading.
  const FileDescriptor output(::open(pipePath.c_str(), O_WRONLY));
  if (!output.valid()) {
    return errno;
  }

  std::vector<char> buffer(64 * 1024);
  while (true) {
    const ssize_t read = ::read(input.get(), buffer.data(), buffer.size());
    if (read == 0) {
      return 0;
    }
    if (read < 0) {
      if (errno == EINTR) {
        continue;
      }
      return errno;
    }
    if (const int error = writeAll(output.get(), buffer.data(), static_cast<size_t>(read)); error != 0) {
      return error;
    }
  }
}

} // namespace margelo::nitro::ffmpegkit
