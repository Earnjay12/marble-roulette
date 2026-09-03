# 마블룰렛 (수업용 커스텀)

[lazygyu/roulette](https://github.com/lazygyu/roulette)(MIT)를 바탕으로 광고·추적을 걷어내고
고해상도 렌더링, 커스텀 맵 4개, 구슬 능력(스킬 20종) 모드, 테마 5종을 더한 버전입니다.

## 실행

```shell
corepack yarn        # 최초 1회
corepack yarn dev    # http://localhost:1235
```

윈도우에서는 `start-server.cmd`를 더블클릭해도 됩니다.

## 빌드와 배포

```shell
corepack yarn build  # dist/ 폴더에 정적 파일 생성
```

서버가 필요 없는 정적 사이트라 `dist/`를 어디에 올려도 됩니다.
Vercel은 저장소를 연결하면 `vercel.json` 설정대로 자동 빌드·배포되고,
GitHub Pages는 `.github/workflows/deploy.yml`이 main 브랜치에 푸시할 때마다 배포합니다.

---

# Marble roulette

This is a lucky draw by dropping marbles.

[Demo]( https://lazygyu.github.io/roulette )

# Requirements

- Typescript
- Parcel
- box2d-wasm

# Development

```shell
> yarn
> yarn dev
```

# Build

```shell
> yarn build
```
