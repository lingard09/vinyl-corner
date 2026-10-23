// 화면(renderer)에서 쓸 수 있는 기능만 골라서 열어준다. Node 기능은 화면에 직접 주지 않는다
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("lp", {
  onNowPlaying: (cb) => ipcRenderer.on("now-playing", (_e, track) => cb(track)),
  onRpm: (cb) => ipcRenderer.on("rpm", (_e, rpm) => cb(rpm)),
  setClickable: (clickable) => ipcRenderer.send("set-clickable", clickable),
  toggle: () => ipcRenderer.send("toggle"),
  menu: () => ipcRenderer.send("menu"),
});
