#!/usr/bin/env bash
set -euo pipefail
TASK_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$TASK_ROOT"
mkdir -p .upstream
if [[ ! -d .upstream/emsdk/.git ]]; then
  git clone --depth 1 --branch 3.1.74 https://github.com/emscripten-core/emsdk.git .upstream/emsdk
fi
if [[ ! -d .upstream/ffmpeg-aac/.git ]]; then
  git clone --depth 1 --branch n8.0 https://github.com/FFmpeg/FFmpeg.git .upstream/ffmpeg-aac
fi
[[ "$(git -C .upstream/emsdk rev-parse HEAD)" == 3d6d8ee910466516a53e665b86458faa81dae9ba ]]
[[ "$(git -C .upstream/ffmpeg-aac rev-parse HEAD)" == 140fd653aed8cad774f991ba083e2d01e86420c7 ]]
.upstream/emsdk/emsdk install 3.1.74
.upstream/emsdk/emsdk activate 3.1.74
source .upstream/emsdk/emsdk_env.sh
cd .upstream/ffmpeg-aac
emconfigure ./configure \
  --target-os=none --arch=x86_32 --enable-cross-compile \
  --disable-asm --disable-x86asm --disable-inline-asm \
  --disable-programs --disable-doc --disable-debug --disable-all \
  --disable-everything --disable-autodetect --disable-pthreads \
  --disable-runtime-cpudetect --enable-avcodec --enable-encoder=aac \
  --cc=emcc --cxx=em++ --ar=emar --ranlib=emranlib \
  --extra-cflags='-DNDEBUG -Oz -flto -msimd128' --extra-ldflags='-Oz -flto'
emmake make -j4
cd "$TASK_ROOT"
node scripts/build-aac.mjs
