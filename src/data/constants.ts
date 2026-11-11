import type { ColorTheme } from '../types/ColorTheme';

export const initialZoom = 30;
export const canvasWidth = 1600;
export const canvasHeight = 900;
export const zoomThreshold = 5;
export const STUCK_DELAY = 5000;
export const winnerAreaHeight = 168;

/** 구슬 기본 반지름. 거대화·축소 스킬이 끝나면 여기로 돌아온다 */
export const MARBLE_RADIUS = 0.25;

export enum Skills {
  None = 0,
  Impact = 1,
  Dash = 2,
  Feather = 4,
  Anchor = 5,
  Magnet = 6,
  Freeze = 7,
  Ghost = 8,
  Grow = 9,
  Bouncy = 11,
  Swap = 13,
  Slap = 14,
  SlowField = 15,
  Hex = 19,
  Gun = 21,
  // 오마주 팩
  Teleport = 22,
  Beam = 23,
  TimeStop = 24,
  ForceGrip = 25,
  WebSwing = 26,
  Thunder = 27,
  Smash = 28,
  Clone = 29,
  RubberPunch = 30,
  Repulsor = 31,
  IceBridge = 32,
  ShieldThrow = 33,
  ShadowStep = 34,
}

/** 스킬 팩. general=일반 스킬, anime=오마주(작품 속 기술에서 영감을 받은 스킬) */
export type SkillPack = 'general' | 'anime';

/** 스킬 옵션. none=스킬 없음, basic=원본과 같은 폭발만, rpg=구슬마다 고유 능력 하나, mono=모든 구슬이 같은 능력 */
export type SkillMode = 'none' | 'basic' | 'rpg' | 'mono';

/** 능력 모드에서 쿨타임이 찼을 때 스킬이 발동할 확률 */
export const RPG_TRIGGER_RATE = 0.7;

export const DefaultEntityColor = {
  box: 'cyan',
  circle: 'yellow',
  polyline: 'white',
} as const;

export const DefaultBloomColor = {
  box: 'cyan',
  circle: 'yellow',
  polyline: 'cyan',
};

export const Themes: Record<string, ColorTheme> = {
  light: {
    background: '#eee',
    marbleLightness: 50,
    marbleWinningBorder: 'black',
    skillColor: '#69c',
    coolTimeIndicator: '#999',
    entity: {
      box: { fill: '#226f92', outline: 'black', bloom: 'cyan', bloomRadius: 0 },
      circle: { fill: 'yellow', outline: '#ed7e11', bloom: 'yellow', bloomRadius: 0 },
      polyline: { fill: 'white', outline: 'black', bloom: 'cyan', bloomRadius: 0 },
    },
    rankStroke: 'black',
    minimapBackground: '#fefefe',
    minimapViewport: '#6699cc',
    winnerBackground: 'rgba(255, 255, 255, 0.5)',
    winnerOutline: 'black',
    winnerText: '#cccccc',
    marbleStyle: 'flat',
    entityStyle: 'plain',
    font: 'sans-serif',
  },
  // 기본: 원본의 다크 모드 그대로
  dark: {
    background: 'black',
    marbleLightness: 75,
    marbleWinningBorder: 'white',
    skillColor: 'white',
    coolTimeIndicator: 'red',
    entity: {
      box: { fill: 'cyan', outline: 'cyan', bloom: 'cyan', bloomRadius: 15 },
      circle: { fill: 'yellow', outline: 'yellow', bloom: 'yellow', bloomRadius: 15 },
      polyline: { fill: 'white', outline: 'white', bloom: 'cyan', bloomRadius: 15 },
    },
    rankStroke: '',
    minimapBackground: '#333333',
    minimapViewport: 'white',
    winnerBackground: 'rgba(0, 0, 0, 0.5)',
    winnerOutline: 'black',
    winnerText: 'white',
    marbleStyle: 'flat',
    entityStyle: 'plain',
    font: 'sans-serif',
  },
  // 핀볼: 짙은 초록 펠트 위의 주황 범퍼, 크롬 레일, 강철 구슬
  pinball: {
    background: '#0d2418',
    marbleLightness: 68,
    marbleWinningBorder: '#fff8dc',
    skillColor: '#ffd54f',
    coolTimeIndicator: '#ff5252',
    entity: {
      box: { fill: '#ffb300', outline: '#ffe082', bloom: '#ff9800', bloomRadius: 12 },
      circle: { fill: '#ff1744', outline: '#ff8a80', bloom: '#ff1744', bloomRadius: 14 },
      polyline: { fill: '#e0e0e0', outline: '#eeeeee', bloom: '#80d8ff', bloomRadius: 8 },
    },
    rankStroke: '#000000',
    minimapBackground: '#1b3a2a',
    minimapViewport: '#ffd54f',
    winnerBackground: 'rgba(0, 0, 0, 0.55)',
    winnerOutline: 'black',
    winnerText: '#ffd54f',
    pattern: 'dots',
    patternColor: 'rgba(255, 255, 255, 0.07)',
    marbleStyle: 'steel',
    entityStyle: 'pinball',
    font: "'Impact', 'Arial Black', sans-serif",
  },
};
