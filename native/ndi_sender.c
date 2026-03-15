#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "Processing.NDI.Lib.h"
#include "Processing.NDI.Send.h"
#include "Processing.NDI.structs.h"

static bool read_exact(uint8_t *buffer, size_t size) {
  size_t offset = 0;

  while (offset < size) {
    const size_t bytes_read = fread(buffer + offset, 1, size - offset, stdin);

    if (bytes_read == 0) {
      return false;
    }

    offset += bytes_read;
  }

  return true;
}

int main(int argc, char **argv) {
  if (argc < 5) {
    fprintf(stderr, "usage: ndi_sender <source_name> <width> <height> <fps>\n");
    return 1;
  }

  const char *source_name = argv[1];
  const int width = atoi(argv[2]);
  const int height = atoi(argv[3]);
  const int fps = atoi(argv[4]);

  if (width <= 0 || height <= 0 || fps <= 0) {
    fprintf(stderr, "invalid NDI frame configuration\n");
    return 1;
  }

  if (!NDIlib_initialize()) {
    fprintf(stderr, "unable to initialize NDI library\n");
    return 1;
  }

  NDIlib_send_create_t create_desc;
  memset(&create_desc, 0, sizeof(create_desc));
  create_desc.p_ndi_name = source_name;
  create_desc.clock_video = true;
  create_desc.clock_audio = false;

  NDIlib_send_instance_t sender = NDIlib_send_create(&create_desc);

  if (!sender) {
    fprintf(stderr, "unable to create NDI sender\n");
    NDIlib_destroy();
    return 1;
  }

  const size_t frame_size = (size_t)width * (size_t)height * 4;
  uint8_t *frame_buffer = (uint8_t *)malloc(frame_size);

  if (!frame_buffer) {
    fprintf(stderr, "unable to allocate frame buffer\n");
    NDIlib_send_destroy(sender);
    NDIlib_destroy();
    return 1;
  }

  NDIlib_video_frame_v2_t video_frame;
  memset(&video_frame, 0, sizeof(video_frame));
  video_frame.xres = width;
  video_frame.yres = height;
  video_frame.FourCC = NDIlib_FourCC_video_type_BGRA;
  video_frame.frame_rate_N = fps;
  video_frame.frame_rate_D = 1;
  video_frame.picture_aspect_ratio = (float)width / (float)height;
  video_frame.frame_format_type = NDIlib_frame_format_type_progressive;
  video_frame.timecode = NDIlib_send_timecode_synthesize;
  video_frame.line_stride_in_bytes = width * 4;
  video_frame.p_data = frame_buffer;

  while (read_exact(frame_buffer, frame_size)) {
    NDIlib_send_send_video_v2(sender, &video_frame);
  }

  free(frame_buffer);
  NDIlib_send_destroy(sender);
  NDIlib_destroy();
  return 0;
}
