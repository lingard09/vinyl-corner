// 화면: 곡 정보를 받아서 LP 모양을 바꾼다
const deck = document.getElementById("deck");
const platter = document.getElementById("platter");
const art = document.getElementById("art");
const initial = document.getElementById("initial");
const title = document.getElementById("title");
const artist = document.getElementById("artist");

let shownId = null;
let shownArt = null;

window.lp.onNowPlaying((track) => {
  if (!track) {
    deck.classList.add("away"); // 재생 중인 곡이 없으면 숨긴다
    window.lp.setClickable(false);
    return;
  }
  deck.classList.remove("away");
  deck.classList.toggle("playing", track.playing);
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
  if ((track.art || null) !== shownArt) {
    shownArt = track.art || null;
    art.classList.remove("ready");
    if (shownArt) art.src = shownArt;
    else art.removeAttribute("src");
  }
});

art.addEventListener("load", () => art.classList.add("ready"));
art.addEventListener("error", () => art.classList.remove("ready"));

window.lp.onRpm((rpm) => {
  // 한 바퀴 걸리는 시간. 33⅓·45는 실제 LP 속도, 기본은 어지럽지 않게 느리게
  document.documentElement.style.setProperty("--rev", rpm === 45 ? "1.333s" : rpm === 33 ? "1.8s" : "4s");
});

// LP 위에서만 클릭을 받는다. 나머지 영역은 뒤 창으로 클릭이 통과한다
platter.addEventListener("mouseenter", () => window.lp.setClickable(true));
platter.addEventListener("mouseleave", () => window.lp.setClickable(false));
platter.addEventListener("click", () => window.lp.toggle()); // 재생/일시정지
platter.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  window.lp.menu(); // 33⅓/45 RPM, 끄기
});
