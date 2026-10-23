// 화면: 곡 정보를 받아서 LP 모양을 바꾼다
const deck = document.getElementById("deck");
const platter = document.getElementById("platter");
const art = document.getElementById("art");
const initial = document.getElementById("initial");
const title = document.getElementById("title");
const artist = document.getElementById("artist");

let shownId = null;
let shownArt = null;
const HOLD_MS = 2000;
let holdUntil = 0;
let heldPlaying = false;

window.lp.onNowPlaying((track) => {
  if (!track) {
    deck.classList.add("away"); // 재생 중인 곡이 없으면 숨긴다
    window.lp.setClickable(false);
    return;
  }
  deck.classList.remove("away");
  // 클릭 직후에는 음악 앱이 옛 상태를 섞어 보내도 누른 상태를 유지한다 (main.js의 HOLD_MS)
  const holding = Date.now() < holdUntil;
  deck.classList.toggle("playing", holding ? heldPlaying : track.playing);
  // 곡이 진행될수록 톤암이 판 안쪽으로 들어간다
  deck.style.setProperty("--progress", track.progress ?? 0);
  title.textContent = track.title;
  artist.textContent = track.artist;

  // 곡이나 커버가 바뀌었을 때만 라벨을 바꾼다 (브라우저는 커버가 제목보다 늦게 오기도 한다)
  if (track.id !== shownId) {
    shownId = track.id;
    // 𝐏 같은 꾸밈 글자는 보통 글자로 (NFKC)
    initial.textContent = [...(track.title || "♪").normalize("NFKC")][0];
  }
  // 새 커버는 다 받은 뒤에 바꿔서, 그 사이 연두색 기본 라벨이 번쩍이지 않게 한다.
  // 커버가 없어졌을 때도 곧 새 커버가 오는 경우가 많아서 1.5초 기다린 뒤에 기본 라벨로
  if ((track.art || null) !== shownArt) {
    shownArt = track.art || null;
    clearTimeout(fallbackTimer);
    if (shownArt) {
      const want = shownArt;
      const img = new Image();
      img.onload = () => {
        if (want === shownArt) art.src = want; // 그 사이 또 바뀌었으면 버린다
      };
      img.onerror = () => {
        if (want === shownArt) art.classList.remove("ready");
      };
      img.src = want;
    } else {
      fallbackTimer = setTimeout(() => {
        art.classList.remove("ready");
        art.removeAttribute("src");
      }, 1500);
    }
  }
});
let fallbackTimer = null;

art.addEventListener("load", () => art.classList.add("ready"));
art.addEventListener("error", () => art.classList.remove("ready"));

// 화면 배율이 작으면 말풍선 글자를 되돌려 키운다 (실제 크기로 12px 안팎 유지, 최대 1.4배)
window.lp.onScale((scale) => {
  document.documentElement.style.setProperty("--text", Math.min(1.4, 1 / scale));
});

window.lp.onRpm((rpm) => {
  // 한 바퀴 걸리는 시간. 33⅓·45는 실제 LP 속도, 기본은 어지럽지 않게 느리게
  document.documentElement.style.setProperty("--rev", rpm === 45 ? "1.333s" : rpm === 33 ? "1.8s" : "4s");
});

// LP 위에서만 클릭을 받는다. 나머지 영역은 뒤 창으로 클릭이 통과한다
platter.addEventListener("mouseenter", () => window.lp.setClickable(true));
platter.addEventListener("mouseleave", () => window.lp.setClickable(false));
// 재생/일시정지. 음악 앱의 응답(최대 1초)을 기다리지 않고 판·톤암을 먼저 바꾼다
// (실제 상태는 main이 바로 다시 보내서 맞춘다)
platter.addEventListener("click", () => {
  heldPlaying = !deck.classList.contains("playing");
  holdUntil = Date.now() + HOLD_MS;
  deck.classList.toggle("playing", heldPlaying);
  platter.classList.remove("tap");
  void platter.offsetWidth; // 연달아 눌러도 링 애니메이션이 다시 시작되게
  platter.classList.add("tap");
  window.lp.toggle();
});
platter.addEventListener("animationend", () => platter.classList.remove("tap"));
platter.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  window.lp.menu(); // 33⅓/45 RPM, 끄기
});
