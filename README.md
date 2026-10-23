<p align="center">
  <img src="build/icon.png" width="128" alt="Vinyl Corner 아이콘">
</p>

<h1 align="center">Vinyl Corner</h1>

<p align="center">
  지금 듣는 노래를, 맥 화면 구석에서 도는 LP로.<br>
  <sub>A tiny spinning record for the corner of your Mac — shows what's playing in Spotify or Apple Music.</sub>
</p>

<p align="center">
  <a href="https://github.com/lingard09/vinyl-corner/releases/latest"><b>⬇ dmg 내려받기</b></a>
</p>

<p align="center">
  <img src="docs/demo.gif" width="420" alt="화면 오른쪽 아래에서 LP가 돌고, 재생을 누르면 톤암이 내려오는 모습">
</p>

## 이런 앱이에요

- 재생 중이면 판이 **33⅓ RPM**으로 돌고, 톤암이 판 위로 내려옵니다
- 곡이 진행될수록 톤암이 판 **안쪽으로** 천천히 들어갑니다
- 가운데 라벨은 지금 곡의 **앨범 커버**
- LP에 마우스를 올리면 곡 제목, 클릭하면 재생/일시정지
- 오른쪽 클릭으로 **45 RPM** 전환, 끄기
- LP 바깥은 클릭이 뒤 창으로 그대로 통과해서 작업을 방해하지 않아요
- 아무것도 재생하지 않으면 조용히 숨어요

## 설치

1. [Releases](https://github.com/lingard09/vinyl-corner/releases/latest)에서 내 맥에 맞는 dmg를 받습니다
   - Apple 실리콘(M1 이후): `VinylCorner-x.y.z-arm64.dmg`
   - 인텔: `VinylCorner-x.y.z-x64.dmg`
2. dmg를 열고 Vinyl Corner를 응용 프로그램 폴더로 옮깁니다
3. 처음 열 때 "확인되지 않은 개발자" 경고가 나오면
   **시스템 설정 → 개인정보 보호 및 보안 → 아래쪽 "그래도 열기"** 를 누릅니다
   (애플 유료 개발자 인증을 받지 않은 개인 프로젝트라 한 번 거쳐야 해요)
4. "Vinyl Corner가 Spotify(Music)를 제어하려고 합니다"가 뜨면 **허용**합니다.
   곡 정보를 읽는 데만 씁니다

> 권한을 거절했다면 시스템 설정 → 개인정보 보호 및 보안 → 자동화에서 다시 켤 수 있어요.

## 지원

| | |
| --- | --- |
| macOS | 12 Monterey 이상 (Apple 실리콘, 인텔) |
| 음악 앱 | Spotify 데스크톱 앱, Apple Music 앱 |
| 아직 안 되는 것 | 브라우저 재생(유튜브, 멜론 웹 등) |

## 개인정보

Vinyl Corner는 아무 데이터도 수집하거나 보내지 않습니다.
밖으로 나가는 요청은 하나뿐이에요. Apple Music 곡의 앨범 커버를 찾으려고 **가수와 앨범 이름**으로 [iTunes 검색 API](https://performance-partners.apple.com/search-api)에 묻습니다.
Spotify 곡은 Spotify 앱이 알려주는 커버 주소를 그대로 씁니다.

## 직접 빌드하기

```bash
git clone https://github.com/lingard09/vinyl-corner.git
cd vinyl-corner
npm install
npm start          # 바로 실행
npm run dist       # dist/ 에 dmg 만들기
```

## 어떻게 동작하나

| 파일 | 하는 일 |
| --- | --- |
| `src/main.js` | 화면 오른쪽 아래에 투명하고 항상 위에 있는 창을 띄우고, 1초마다 곡을 확인해 바뀌었을 때만 화면에 알립니다 |
| `src/nowplaying.js` | `osascript`(JavaScript for Automation)로 Spotify·Music 앱에 지금 곡과 재생 위치를 묻습니다 |
| `src/preload.js` | 화면에서 쓸 수 있는 기능만 골라서 열어줍니다 |
| `src/renderer/` | 판(CSS 동심원), 톤암(SVG), 곡이 바뀔 때 라벨 교체 |

macOS 15.4부터 시스템의 "지금 재생 중" 기능(MediaRemote)을 일반 앱이 쓸 수 없게 막혀서,
음악 앱에 직접 묻는 공식 방법을 씁니다. 그래서 지원하는 앱이 Spotify·Music입니다.

## 앞으로

- [ ] 앨범 커버 색으로 자동 컬러반
- [ ] 판 색 고르기 (블랙, 화이트, 마블)
- [ ] 브라우저 재생 지원
- [ ] 실물 LP 연동: 슬리브의 NFC 태그를 폰으로 톡 → 지금 올린 판을 맥에도

아이디어나 버그는 [Issues](https://github.com/lingard09/vinyl-corner/issues)에 남겨 주세요.

## License

[MIT](LICENSE)
