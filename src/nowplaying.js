// 지금 재생 중인 곡 읽기
//
// macOS 15.4부터 "지금 재생 중" 시스템 기능(MediaRemote)을 일반 앱이 못 쓰게 막혀서,
// 음악 앱에 직접 물어보는 공식 방법(AppleScript)을 쓴다. 대신 Spotify 앱과 Apple Music 앱만 된다.
// 처음 실행하면 macOS가 "이 앱이 Spotify(Music)를 제어하려고 합니다" 권한을 한 번 묻는다.

const { execFile } = require("node:child_process");

// osascript에 넘길 JavaScript(JXA). 켜져 있는 앱만 확인하고, 꺼진 앱을 새로 켜지 않는다(running()).
// 재생 중인 앱을 먼저, 없으면 일시정지된 앱을 고른다.
const READ_SCRIPT = `
function read(name) {
  try {
    const app = Application(name);
    if (!app.running()) return null;
    const state = String(app.playerState());
    if (state === "stopped") return null;
    const t = app.currentTrack;
    const info = {
      app: name,
      playing: state === "playing",
      title: t.name(),
      artist: t.artist(),
      album: t.album(),
      id: name === "Spotify" ? t.id() : t.persistentID(),
      art: name === "Spotify" ? t.artworkUrl() : null,
      // 곡 진행률 0~1 (톤암 위치). Spotify는 곡 길이를 밀리초, Music은 초로 준다
      progress: 0,
    };
    try {
      // 재생 위치를 못 읽어도 곡 정보는 보여준다 (톤암만 바깥쪽에)
      const duration = name === "Spotify" ? t.duration() / 1000 : t.duration();
      if (duration > 0) info.progress = Math.min(1, Math.max(0, app.playerPosition() / duration));
    } catch (e) {}
    return info.title ? info : null;
  } catch (e) {
    return null; // 앱이 없거나 곡 정보가 없을 때
  }
}
const found = ["Spotify", "Music"].map(read).filter(Boolean);
JSON.stringify(found.find((x) => x.playing) || found[0] || null);
`;

function osascript(script) {
  return new Promise((resolve, reject) => {
    execFile("osascript", ["-l", "JavaScript", "-e", script], { timeout: 4000 }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout.trim());
    });
  });
}

/** 지금 재생 중인 곡. 없으면 null */
async function readNowPlaying() {
  const out = await osascript(READ_SCRIPT);
  const track = out ? JSON.parse(out) : null;
  if (track) track.progress = Math.round(track.progress * 1000) / 1000;
  if (track && !track.art) track.art = await findArtwork(track.artist, track.album);
  return track;
}

/** 재생/일시정지 전환 (LP를 클릭했을 때) */
function togglePlay(appName) {
  if (appName !== "Spotify" && appName !== "Music") return Promise.resolve();
  return osascript(`Application(${JSON.stringify(appName)}).playpause()`).catch(() => {});
}

// Apple Music은 스트리밍 곡의 앨범 커버를 AppleScript로 잘 안 준다.
// 그래서 iTunes 검색 API(키 필요 없음)로 앨범 커버를 찾는다. 같은 앨범은 한 번만 찾는다.
const artCache = new Map();

async function findArtwork(artist, album) {
  const key = `${artist}\u0000${album}`;
  if (artCache.has(key)) return artCache.get(key);
  let url = null;
  for (const country of ["KR", "US"]) {
    try {
      const term = encodeURIComponent(`${artist} ${album}`);
      const res = await fetch(`https://itunes.apple.com/search?term=${term}&entity=album&limit=1&country=${country}`);
      const hit = (await res.json()).results?.[0]?.artworkUrl100;
      if (hit) {
        url = hit.replace("100x100bb", "600x600bb"); // 큰 이미지로
        break;
      }
    } catch {
      // 인터넷이 안 되면 커버 없이 보여준다
    }
  }
  artCache.set(key, url);
  return url;
}

module.exports = { readNowPlaying, togglePlay };
