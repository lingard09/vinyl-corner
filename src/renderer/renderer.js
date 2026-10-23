// 화면: 곡 정보를 받아서 LP 모양을 바꾼다
const deck = document.getElementById("deck");
const platter = document.getElementById("platter");
const art = document.getElementById("art");
const initial = document.getElementById("initial");
const title = document.getElementById("title");
const artist = document.getElementById("artist");

let shownId = null;

window.lp.onNowPlaying((track) => {
  if (!track) {
    deck.classList.add("away"); // 재생 중인 곡이 없으면 숨긴다
    window.lp.setClickable(false);
    return;
  }
  deck.classList.remove("away");
  deck.classList.toggle("playing", track.playing);
  title.textContent = track.title;
  artist.textContent = track.artist;

  // 곡이 바뀌었을 때만 라벨(앨범 커버)을 바꾼다
  if (track.id !== shownId) {
    shownId = track.id;
    initial.textContent = [...(track.title || "♪")][0];
    art.classList.remove("ready");
    if (track.art) art.src = track.art;
    else art.removeAttribute("src");
  }
});

art.addEventListener("load", () => art.classList.add("ready"));
art.addEventListener("error", () => art.classList.remove("ready"));

window.lp.onRpm((rpm) => {
  document.documentElement.style.setProperty("--rev", rpm === 45 ? "1.333s" : "1.8s");
});

// LP 위에서만 클릭을 받는다. 나머지 영역은 뒤 창으로 클릭이 통과한다
platter.addEventListener("mouseenter", () => window.lp.setClickable(true));
platter.addEventListener("mouseleave", () => window.lp.setClickable(false));
platter.addEventListener("click", () => window.lp.toggle()); // 재생/일시정지
platter.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  window.lp.menu(); // 33⅓/45 RPM, 끄기
});
