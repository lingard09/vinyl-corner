// Vinyl Corner: 지금 재생 중인 노래를 화면 오른쪽 아래에 도는 LP로 띄운다
const { app, BrowserWindow, Menu, ipcMain, screen } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { readNowPlaying, togglePlay } = require("./nowplaying");
const { startSystem, stopSystem } = require("./system");

const WIDTH = 280; // 창 크기 (LP + 톤암 + 위쪽 곡 정보 말풍선)
const HEIGHT = 260;
const MARGIN = 12; // 화면 가장자리와의 간격
const POLL_MS = 1000; // 곡 정보를 확인하는 간격

let win = null;
let current = null; // 마지막으로 보낸 곡
// 도는 속도: "slow"(한 바퀴 4초, 기본), 33(33⅓ 실제 속도), 45. 다시 켜도 기억한다
const SETTINGS = path.join(app.getPath("userData"), "settings.json");
function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS, "utf8"));
  } catch {
    return {};
  }
}
function saveSettings(patch) {
  try {
    fs.writeFileSync(SETTINGS, JSON.stringify({ ...loadSettings(), ...patch }));
  } catch {
    // 저장 못 해도 이번 실행에서는 그대로 쓴다
  }
}
const savedRpm = loadSettings().rpm;
let rpm = ["slow", 33, 45].includes(savedRpm) ? savedRpm : "slow";

// 크기: "auto"(화면 높이에 맞춤, 기본), "small", "medium", "large". 판 지름 176px이 1배
const SIZES = { small: 0.7, medium: 0.85, large: 1 };
const savedSize = loadSettings().size;
let size = savedSize in SIZES ? savedSize : "auto";

// 판 지름을 화면 높이의 약 12%로 (27인치 ≈ 지금 크기, 14인치는 120px 정도)
function scaleFor(workArea) {
  if (size !== "auto") return SIZES[size];
  return Math.min(1, Math.max(0.6, (workArea.height * 0.12) / 176));
}

// 창 크기·위치와 화면 배율을 함께 맞춘다 (모니터를 꽂거나 뺄 때도)
function fitWindow() {
  if (!win) return;
  const { workArea } = screen.getPrimaryDisplay(); // 독·메뉴바를 뺀 영역
  const scale = scaleFor(workArea);
  const width = Math.round(WIDTH * scale);
  // 말풍선 글자는 덜 줄어드니(--text), 줄어든 만큼 위쪽에 자리를 더 둔다
  const height = Math.round(HEIGHT * scale + 50 * (1 - scale));
  win.setBounds({
    width,
    height,
    x: workArea.x + workArea.width - width - MARGIN,
    y: workArea.y + workArea.height - height - MARGIN,
  });
  win.webContents.setZoomFactor(scale); // CSS 전체를 같은 비율로 줄인다
  win.webContents.send("scale", scale);
}

function createWindow() {
  win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    transparent: true, // 배경 없이 LP만 보이게
    frame: false,
    resizable: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false, // 눌러도 지금 쓰던 앱의 포커스를 뺏지 않게
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
    },
  });
  win.setAlwaysOnTop(true, "floating");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // 기본은 클릭이 뒤 창으로 통과한다. LP 위에 마우스가 올라왔을 때만 클릭을 받는다 (setClickable)
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, "renderer", "index.html"));
  fitWindow();
  win.webContents.on("did-finish-load", () => {
    fitWindow(); // 줌 배율은 페이지를 읽은 뒤에 다시 걸어야 확실하다
    win.webContents.send("rpm", rpm);
    if (current) win.webContents.send("now-playing", current);
  });
}

// 1초마다 확인하고, 곡이나 재생 상태가 바뀌었을 때만 화면에 알린다
let inflight = null; // 진행 중인 확인 (겹치지 않게)
function poll() {
  if (inflight || !win) return inflight || Promise.resolve();
  inflight = (async () => {
    try {
      const track = await readNowPlaying();
      const changed = JSON.stringify(track) !== JSON.stringify(current);
      current = track;
      if (changed) win.webContents.send("now-playing", track);
    } catch {
      // osascript가 실패해도 다음 확인에서 다시 시도한다
    }
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

// 클릭 전에 시작된 확인은 옛 상태를 읽었을 수 있어서, 그게 끝난 뒤 새로 한 번 더 확인한다
async function pollFresh() {
  if (inflight) await inflight;
  await poll();
}

ipcMain.on("set-clickable", (_e, clickable) => {
  win?.setIgnoreMouseEvents(!clickable, { forward: true });
});

ipcMain.on("toggle", () => {
  // 화면은 누르자마자 바꿔 두니(renderer.js), 확인한 실제 상태를 바뀌었든 아니든 다시 보낸다
  if (current) {
    // 브라우저 쪽은 바뀐 상태가 조금 늦게 들어와서, 바로 확인하면 옛 상태로 되돌아갔다가 다시 바뀐다
    const settle = current.app === "system" ? 600 : 0;
    togglePlay(current.app)
      .then(() => new Promise((resolve) => setTimeout(resolve, settle)))
      .then(pollFresh)
      .then(() => win?.webContents.send("now-playing", current));
  }
});

// LP를 오른쪽 클릭하면 나오는 메뉴
ipcMain.on("menu", () => {
  const setRpm = (value) => {
    rpm = value;
    saveSettings({ rpm });
    win?.webContents.send("rpm", rpm);
  };
  const setSize = (value) => {
    size = value;
    saveSettings({ size });
    fitWindow();
  };
  Menu.buildFromTemplate([
    { label: current ? `${current.title} — ${current.artist}` : "재생 중인 곡 없음", enabled: false },
    { type: "separator" },
    { label: "느긋하게", type: "radio", checked: rpm === "slow", click: () => setRpm("slow") },
    { label: "33⅓ RPM (실제 속도)", type: "radio", checked: rpm === 33, click: () => setRpm(33) },
    { label: "45 RPM", type: "radio", checked: rpm === 45, click: () => setRpm(45) },
    { type: "separator" },
    {
      label: "크기",
      submenu: [
        ["auto", "화면에 맞춤"],
        ["small", "작게"],
        ["medium", "보통"],
        ["large", "크게"],
      ].map(([value, label]) => ({ label, type: "radio", checked: size === value, click: () => setSize(value) })),
    },
    { type: "separator" },
    { label: "Vinyl Corner 끄기", click: () => app.quit() },
  ]).popup({ window: win });
});

app.on("will-quit", stopSystem);

// 두 번 실행하면 하나만 남긴다
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(() => {
    app.dock?.hide(); // 독에 아이콘을 띄우지 않는다 (끄기는 LP 오른쪽 클릭 메뉴에서)
    createWindow();
    // 외부 모니터를 꽂거나 빼면 그 화면에 맞춰 다시 놓는다
    for (const event of ["display-added", "display-removed", "display-metrics-changed"]) screen.on(event, fitWindow);
    startSystem(); // 브라우저 등 시스템 "지금 재생 중" (준비 안 됐으면 조용히 건너뜀)
    poll();
    setInterval(poll, POLL_MS);
  });
}
