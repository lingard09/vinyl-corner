// 시스템 "지금 재생 중" 읽기 (브라우저의 유튜브 뮤직, 유튜브, 멜론 웹 등)
//
// macOS 15.4부터 일반 앱은 MediaRemote(제어 센터의 "지금 재생 중")를 못 쓴다.
// mediaremote-adapter(BSD-3, github.com/ungive/mediaremote-adapter)는 macOS에 기본으로 있는
// /usr/bin/perl을 거쳐 이 정보를 읽는다. 애플이 다시 막을 수 있는 우회라서, Spotify·Music은
// 기존 방식(AppleScript)을 그대로 쓰고 이건 그 둘이 아닐 때만 쓴다. 실패하면 조용히 꺼진다.

const { spawn, execFile } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

// 기존 방식으로 읽는 앱은 여기서 빼서 두 번 잡히지 않게 한다
const SKIP_BUNDLES = new Set(["com.spotify.client", "com.apple.Music"]);

// 패키징된 앱: Contents/Resources/mediaremote, 개발 중: vendor/mediaremote (scripts/build-adapter.sh)
function adapterDir() {
  const packaged = process.resourcesPath ? path.join(process.resourcesPath, "mediaremote") : null;
  const dev = path.join(__dirname, "..", "vendor", "mediaremote");
  return [packaged, dev].find((dir) => dir && fs.existsSync(path.join(dir, "MediaRemoteAdapter.framework")));
}

let state = {}; // 마지막 전체 정보 (stream이 바뀐 값만 보내면 여기에 합친다)
let child = null;
let stopped = false;
let restarts = 0;
let artUrl = null; // artworkData를 data URL로 바꾼 것 (바뀔 때만 다시 만든다)

function start() {
  const dir = adapterDir();
  if (!dir || stopped) return;
  const args = [path.join(dir, "mediaremote-adapter.pl"), path.join(dir, "MediaRemoteAdapter.framework"), "stream", "--micros", "--debounce=200"];
  child = spawn("/usr/bin/perl", args, { stdio: ["ignore", "pipe", "ignore"] });

  let buf = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    buf += chunk;
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      if (line.trim()) apply(line);
    }
  });
  child.on("exit", () => {
    child = null;
    state = {};
    artUrl = null;
    // 죽으면 몇 번만 다시 켠다 (막혔으면 계속 실패하니 포기)
    if (!stopped && restarts++ < 5) setTimeout(start, 3000 * restarts);
  });
}

function apply(line) {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  if (msg.type !== "data" || !msg.payload) return;
  restarts = 0; // 데이터가 오면 정상
  const next = msg.diff ? { ...state } : {};
  for (const [key, value] of Object.entries(msg.payload)) {
    if (value === null) delete next[key];
    else next[key] = value;
  }
  if (next.artworkData !== state.artworkData || !msg.diff) {
    artUrl = next.artworkData ? `data:${next.artworkMimeType || "image/jpeg"};base64,${next.artworkData}` : null;
  }
  state = next;
  if (!next.title) lastOther = null; // 재생하던 탭을 닫으면 잊는다
}

/** 시스템에서 재생 중인 곡 (Spotify·Music 제외). 없으면 null */
let lastOther = null; // Spotify·Music이 아닌 마지막 곡

function readSystem() {
  const s = state;
  if (!s.title) return null;
  // 시스템 "지금 재생 중"이 Spotify·Music으로 넘어가도, 멈춘 브라우저 곡은 멈춘 상태로 남겨 둔다
  // (어느 쪽을 보여줄지는 nowplaying.js가 마지막으로 재생하던 곳 기준으로 고른다)
  if (SKIP_BUNDLES.has(s.parentApplicationBundleIdentifier || s.bundleIdentifier)) {
    return lastOther ? { ...lastOther, playing: false } : null;
  }
  // 재생 위치는 timestamp 시점의 값이라, 재생 중이면 그 뒤로 흐른 시간을 더한다
  let progress = 0;
  if (s.durationMicros > 0 && s.elapsedTimeMicros != null) {
    let elapsed = s.elapsedTimeMicros;
    if (s.playing && s.timestampEpochMicros) elapsed += (Date.now() * 1000 - s.timestampEpochMicros) * (s.playbackRate || 1);
    progress = Math.min(1, Math.max(0, elapsed / s.durationMicros));
  }
  lastOther = {
    app: "system",
    playing: Boolean(s.playing),
    title: s.title,
    artist: s.artist || "",
    album: s.album || "",
    id: s.uniqueIdentifier ? String(s.uniqueIdentifier) : `${s.bundleIdentifier}\u0000${s.title}\u0000${s.artist}`,
    art: artUrl,
    progress,
  };
  return lastOther;
}

/** 재생/일시정지 전환 (kMRTogglePlayPause = 2) */
function toggleSystem() {
  const dir = adapterDir();
  if (!dir) return Promise.resolve();
  const args = [path.join(dir, "mediaremote-adapter.pl"), path.join(dir, "MediaRemoteAdapter.framework"), "send", "2"];
  return new Promise((resolve) => execFile("/usr/bin/perl", args, { timeout: 4000 }, () => resolve()));
}

function stopSystem() {
  stopped = true;
  child?.kill("SIGTERM");
}

module.exports = { startSystem: start, readSystem, toggleSystem, stopSystem };
