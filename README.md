# 판돌이

맥에서 지금 재생 중인 노래를 화면 오른쪽 아래에 **도는 LP**로 띄워주는 앱.

- 재생 중이면 판이 33⅓ RPM으로 돌고 톤암이 내려온다. 멈추면 톤암이 올라가고 판이 선다
- 가운데 라벨은 앨범 커버
- 곡이 진행될수록 톤암이 판 안쪽으로 들어간다
- LP에 마우스를 올리면 곡 제목·가수, 클릭하면 재생/일시정지, 오른쪽 클릭하면 RPM 바꾸기·끄기
- LP 밖은 클릭이 뒤 창으로 그대로 통과한다
- 재생 중인 곡이 없으면 숨는다

## 실행

```bash
npm install
npm start
```

처음 실행하면 macOS가 **"Electron이(가) Spotify(또는 Music)를 제어하려고 합니다"** 라고 묻는다. 허용해야 곡 정보를 읽을 수 있다.
거절했다면 시스템 설정 → 개인정보 보호 및 보안 → 자동화에서 다시 켤 수 있다.

## dmg로 묶기 (배포용)

```bash
npm install
npm run dist
```

`dist/` 폴더에 `Pandori-0.1.0-arm64.dmg`(Apple 실리콘), `Pandori-0.1.0-x64.dmg`(인텔)가 생긴다.
애플 공증을 받지 않은 앱이라, 받은 사람은 처음 열 때 **시스템 설정 → 개인정보 보호 및 보안 → "그래도 열기"**를 한 번 눌러야 한다.

- `LSUIElement`: 독에 아이콘을 띄우지 않는다
- `NSAppleEventsUsageDescription`: Spotify·Music 제어 권한을 물을 때 보여줄 문장. 이게 없으면 배포한 앱에서는 권한 창이 안 뜨고 곡을 못 읽는다
- `identity: "-"`: 정식 서명 대신 임시(ad-hoc) 서명. 서명이 아예 없으면 Apple 실리콘 맥에서 "손상된 앱"으로 나온다

## 지원하는 앱

- Spotify 데스크톱 앱
- Apple Music 앱

브라우저에서 듣는 유튜브·멜론 웹 등은 아직 안 된다.

## 어떻게 동작하나

| 파일 | 하는 일 |
| --- | --- |
| `src/main.js` | 화면 오른쪽 아래에 투명하고 항상 위에 있는 창을 띄우고, 1초마다 곡을 확인해 바뀌었을 때만 화면에 알린다 |
| `src/nowplaying.js` | `osascript`(AppleScript의 JavaScript 버전)로 Spotify·Music에 지금 곡을 묻는다. Music은 앨범 커버를 iTunes 검색 API로 찾는다 |
| `src/preload.js` | 화면에서 쓸 수 있는 기능만 골라서 열어준다 |
| `src/renderer/` | LP 그림(CSS), 톤암(SVG), 곡이 바뀔 때 라벨 교체 |

macOS 15.4부터 "지금 재생 중" 시스템 기능(MediaRemote)을 일반 앱이 쓸 수 없게 막혀서, 음악 앱에 직접 묻는 방법을 쓴다.
그래서 지원하는 앱이 Spotify·Music뿐이다.

## 다음에 할 것

- 브라우저 재생 지원: [mediaremote-adapter](https://github.com/ungive/mediaremote-adapter)로 시스템 "지금 재생 중"을 읽기
- 실물 LP: 슬리브에 NFC 태그를 붙이고 아이폰으로 톡 → 지금 돌아가는 판 띄우기
