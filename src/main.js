// Vinyl Corner: 지금 재생 중인 노래를 화면 오른쪽 아래에 도는 LP로 띄운다
const { app, BrowserWindow, Menu, ipcMain, screen } = require("electron");
const path = require("node:path");
const { readNowPlaying, togglePlay } = require("./nowplaying");

const WIDTH = 280; // 창 크기 (LP + 톤암 + 위쪽 곡 정보 말풍선)
const HEIGHT = 260;
const MARGIN = 12; // 화면 가장자리와의 간격
const POLL_MS = 1000; // 곡 정보를 확인하는 간격

let win = null;
let current = null; // 마지막으로 보낸 곡
let rpm = 33; // 33⅓ 또는 45

function createWindow() {
  const { workArea } = screen.getPrimaryDisplay(); // 독·메뉴바를 뺀 영역
  win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    x: workArea.x + workArea.width - WIDTH - MARGIN,
    y: workArea.y + workArea.height - HEIGHT - MARGIN,
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
  win.webContents.on("did-finish-load", () => {
    win.webContents.send("rpm", rpm);
    if (current) win.webContents.send("now-playing", current);
  });
}

// 1초마다 확인하고, 곡이나 재생 상태가 바뀌었을 때만 화면에 알린다
let polling = false;
async function poll() {
  if (polling || !win) return;
  polling = true;
  try {
    const track = await readNowPlaying();
    const changed = JSON.stringify(track) !== JSON.stringify(current);
    current = track;
    if (changed) win.webContents.send("now-playing", track);
  } catch {
    // osascript가 실패해도 다음 확인에서 다시 시도한다
  } finally {
    polling = false;
  }
}

ipcMain.on("set-clickable", (_e, clickable) => {
  win?.setIgnoreMouseEvents(!clickable, { forward: true });
});

ipcMain.on("toggle", () => {
  if (current) togglePlay(current.app).then(poll);
});

// LP를 오른쪽 클릭하면 나오는 메뉴
ipcMain.on("menu", () => {
  const setRpm = (value) => {
    rpm = value;
    win?.webContents.send("rpm", rpm);
  };
  Menu.buildFromTemplate([
    { label: current ? `${current.title} — ${current.artist}` : "재생 중인 곡 없음", enabled: false },
    { type: "separator" },
    { label: "33⅓ RPM", type: "radio", checked: rpm === 33, click: () => setRpm(33) },
    { label: "45 RPM", type: "radio", checked: rpm === 45, click: () => setRpm(45) },
    { type: "separator" },
    { label: "Vinyl Corner 끄기", click: () => app.quit() },
  ]).popup({ window: win });
});

// 두 번 실행하면 하나만 남긴다
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(() => {
    app.dock?.hide(); // 독에 아이콘을 띄우지 않는다 (끄기는 LP 오른쪽 클릭 메뉴에서)
    createWindow();
    poll();
    setInterval(poll, POLL_MS);
  });
}
