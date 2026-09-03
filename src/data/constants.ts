import type { ColorTheme } from '../types/ColorTheme';

export const initialZoom = 30;
export const canvasWidth = 1600;
export const canvasHeight = 900;
export const zoomThreshold = 5;
export const STUCK_DELAY = 5000;
export const winnerAreaHeight = 168;

export enum Skills {
  None = 0,
  Impact = 1,
  Dash = 2,
  Jump = 3,
  Feather = 4,
  Anchor = 5,
  Magnet = 6,
  Freeze = 7,
  Ghost = 8,
}

/** 스킬 옵션. none=스킬 없음, basic=원본과 같은 폭발만, rpg=구슬마다 고유 능력 하나 */
export type SkillMode = 'none' | 'basic' | 'rpg';

export interface SkillInfo {
  name: string;
  icon: string;
  color: string;
  description: string;
  /** 지속 효과(깃털·무게추·유령)의 유지 시간(ms). 없으면 즉발 */
  duration?: number;
  /** 이펙트 링의 최대 반지름(월드 단위). 주변에 영향을 주는 스킬은 크게 */
  effectRadius: number;
}

export const SkillInfos: Record<Skills, SkillInfo> = {
  [Skills.None]: { name: '없음', icon: '', color: '#ffffff', description: '', effectRadius: 0 },
  [Skills.Impact]: {
    name: '폭발',
    icon: '💥',
    color: '#ff9f43',
    description: '주변 구슬을 사방으로 밀어낸다',
    effectRadius: 10,
  },
  [Skills.Dash]: {
    name: '돌진',
    icon: '🚀',
    color: '#ff6b6b',
    description: '아래로 세게 가속한다',
    effectRadius: 3,
  },
  [Skills.Jump]: {
    name: '도약',
    icon: '🦘',
    color: '#54e346',
    description: '위로 튀어 오른다. 앞서갈 수도, 뒤처질 수도 있다',
    effectRadius: 3,
  },
  [Skills.Feather]: {
    name: '깃털',
    icon: '🪶',
    color: '#dfe6e9',
    description: '잠시 깃털처럼 천천히 떨어진다',
    duration: 1500,
    effectRadius: 3,
  },
  [Skills.Anchor]: {
    name: '무게추',
    icon: '⚓',
    color: '#a4b0be',
    description: '잠시 무거워져 빠르게 떨어진다',
    duration: 1500,
    effectRadius: 3,
  },
  [Skills.Magnet]: {
    name: '자석',
    icon: '🧲',
    color: '#e84393',
    description: '주변 구슬을 자기 쪽으로 끌어당긴다',
    effectRadius: 10,
  },
  [Skills.Freeze]: {
    name: '얼음',
    icon: '❄️',
    color: '#74b9ff',
    description: '주변 구슬을 그 자리에 멈춰 세운다',
    effectRadius: 6,
  },
  [Skills.Ghost]: {
    name: '유령',
    icon: '👻',
    color: '#c8d6e5',
    description: '잠시 다른 구슬을 통과한다',
    duration: 1500,
    effectRadius: 3,
  },
};

/** 능력 모드에서 구슬에 나눠 주는 스킬 목록 */
export const RPG_SKILL_POOL: Skills[] = [
  Skills.Impact,
  Skills.Dash,
  Skills.Jump,
  Skills.Feather,
  Skills.Anchor,
  Skills.Magnet,
  Skills.Freeze,
  Skills.Ghost,
];

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
  },
  // 핀볼: 짙은 초록 펠트 위의 주황 범퍼와 크롬 레일
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
  },
  // 판타지: 보랏빛 밤하늘, 황금·에메랄드·라벤더
  fantasy: {
    background: '#160b2b',
    marbleLightness: 74,
    marbleWinningBorder: '#ffe9a6',
    skillColor: '#ffd700',
    coolTimeIndicator: '#ff7eb6',
    entity: {
      box: { fill: '#ffd700', outline: '#fff1a8', bloom: '#ffb300', bloomRadius: 14 },
      circle: { fill: '#5ef2c3', outline: '#b9ffe8', bloom: '#5ef2c3', bloomRadius: 14 },
      polyline: { fill: '#c9a7ff', outline: '#d9c2ff', bloom: '#8e5cff', bloomRadius: 16 },
    },
    rankStroke: '#000000',
    minimapBackground: '#2a1850',
    minimapViewport: '#ffd700',
    winnerBackground: 'rgba(20, 5, 40, 0.6)',
    winnerOutline: 'black',
    winnerText: '#ffe9a6',
    pattern: 'stars',
    patternColor: 'rgba(255, 240, 200, 0.8)',
  },
  // 미래도시: 남색 바탕에 네온 시안·마젠타, 강한 번짐
  cyber: {
    background: '#04060f',
    marbleLightness: 75,
    marbleWinningBorder: '#ffffff',
    skillColor: '#ff2bd6',
    coolTimeIndicator: '#ff2bd6',
    entity: {
      box: { fill: '#00f0ff', outline: '#8ff9ff', bloom: '#00f0ff', bloomRadius: 22 },
      circle: { fill: '#ff2bd6', outline: '#ff9de9', bloom: '#ff2bd6', bloomRadius: 22 },
      polyline: { fill: '#7dfcff', outline: '#7dfcff', bloom: '#0077ff', bloomRadius: 18 },
    },
    rankStroke: '',
    minimapBackground: '#0a1230',
    minimapViewport: '#00f0ff',
    winnerBackground: 'rgba(0, 10, 30, 0.6)',
    winnerOutline: 'black',
    winnerText: '#00f0ff',
    pattern: 'grid',
    patternColor: 'rgba(0, 240, 255, 0.09)',
  },
  // 낙서: 공책 종이 위에 연필과 빨간 펜
  doodle: {
    background: '#fbf7ea',
    marbleLightness: 50,
    marbleWinningBorder: '#222222',
    skillColor: '#d63031',
    coolTimeIndicator: '#d63031',
    entity: {
      box: { fill: '#2d3436', outline: '#2d3436', bloom: 'transparent', bloomRadius: 0 },
      circle: { fill: '#d63031', outline: '#d63031', bloom: 'transparent', bloomRadius: 0 },
      polyline: { fill: '#2d3436', outline: '#2d3436', bloom: 'transparent', bloomRadius: 0 },
    },
    rankStroke: '',
    minimapBackground: '#efe8d2',
    minimapViewport: '#0984e3',
    winnerBackground: 'rgba(255, 255, 255, 0.7)',
    winnerOutline: '#2d3436',
    winnerText: '#2d3436',
    pattern: 'paper',
    patternColor: 'rgba(9, 132, 227, 0.25)',
  },
};
