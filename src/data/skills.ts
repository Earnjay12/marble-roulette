import options from '../options';
import { Skills } from './constants';

/** 발동 이펙트의 종류. skillEffect.ts가 이 값으로 입자·링 모양을 고른다 */
export type EffectKind =
  | 'burst'
  | 'down'
  | 'up'
  | 'float'
  | 'drop'
  | 'pull'
  | 'frost'
  | 'fade'
  | 'grow'
  | 'shrink'
  | 'bounce'
  | 'stop'
  | 'swap'
  | 'slap'
  | 'slow'
  | 'rise'
  | 'boost'
  | 'zigzag'
  | 'hex'
  | 'shield';

export interface SkillDef {
  name: string;
  description: string;
  color: string;
  /** 지속 효과의 유지 시간(ms). 없으면 즉발 */
  duration?: number;
  /** 이펙트 링의 최대 반지름(월드 단위). 주변에 영향을 주는 스킬은 크게 */
  effectRadius: number;
  effect: EffectKind;
  /** 24×24 뷰박스 기준 SVG 경로. 배지 위에 흰색으로 채워 그린다 */
  icon: string;
  iconRule?: 'nonzero' | 'evenodd';
}

/** 20종 스킬의 기본 정의. 테마별 세트가 이름·설명·색을 덮어쓸 수 있다 */
export const SkillDefs: Record<Skills, SkillDef> = {
  [Skills.None]: { name: '없음', description: '', color: '#ffffff', effectRadius: 0, effect: 'burst', icon: '' },
  [Skills.Impact]: {
    name: '폭발',
    description: '주변 구슬을 사방으로 밀어낸다',
    color: '#ff9f43',
    effectRadius: 10,
    effect: 'burst',
    icon: 'M23 12l-6.4 1.9 3.2 5.9-5.9-3.2L12 23l-1.9-6.4-5.9 3.2 3.2-5.9L1 12l6.4-1.9-3.2-5.9 5.9 3.2L12 1l1.9 6.4 5.9-3.2-3.2 5.9z',
  },
  [Skills.Dash]: {
    name: '돌진',
    description: '아래로 세게 가속한다',
    color: '#ff6b6b',
    effectRadius: 3,
    effect: 'down',
    icon: 'M9 2h6v10h5l-8 10-8-10h5z',
  },
  [Skills.Jump]: {
    name: '도약',
    description: '위로 튀어 오른다. 앞서갈 수도, 뒤처질 수도 있다',
    color: '#54e346',
    effectRadius: 3,
    effect: 'up',
    icon: 'M9 22h6V12h5L12 2 4 12h5z',
  },
  [Skills.Feather]: {
    name: '깃털',
    description: '잠시 깃털처럼 천천히 떨어진다',
    color: '#dfe6e9',
    duration: 2000,
    effectRadius: 3,
    effect: 'float',
    icon: 'M21 3c-7 0-13 4-15 11l-4 7 2 1 3-5c7 0 12-4 14-11V3zM9 15l7-7 1 1-7 7z',
    iconRule: 'evenodd',
  },
  [Skills.Anchor]: {
    name: '무게추',
    description: '잠시 무거워져 빠르게 떨어진다',
    color: '#a4b0be',
    duration: 2000,
    effectRadius: 3,
    effect: 'drop',
    icon: 'M12 2a3 3 0 00-1 5.8V9H8v2h3v8.9C8.5 19.5 6.5 17.5 6 15H4c.6 4 4 7 8 7s7.4-3 8-7h-2c-.5 2.5-2.5 4.5-5 4.9V11h3V9h-3V7.8A3 3 0 0012 2zm0 2a1 1 0 110 2 1 1 0 010-2z',
    iconRule: 'evenodd',
  },
  [Skills.Magnet]: {
    name: '자석',
    description: '주변 구슬을 자기 쪽으로 끌어당긴다',
    color: '#e84393',
    effectRadius: 10,
    effect: 'pull',
    icon: 'M5 3h5v9a2 2 0 004 0V3h5v9a7 7 0 01-14 0zm2 2v2h1V5zm10 0v2h1V5z',
    iconRule: 'evenodd',
  },
  [Skills.Freeze]: {
    name: '얼음',
    description: '주변 구슬을 그 자리에 멈춰 세운다',
    color: '#74b9ff',
    effectRadius: 6,
    effect: 'frost',
    icon: 'M11 1h2v22h-2zM2.5 6.7l1-1.7L22.5 16l-1 1.7zM2.5 17.3L21.5 6.3l1 1.7L3.5 19z',
  },
  [Skills.Ghost]: {
    name: '유령',
    description: '잠시 다른 구슬을 통과한다',
    color: '#c8d6e5',
    duration: 2500,
    effectRadius: 3,
    effect: 'fade',
    icon: 'M12 2a8 8 0 00-8 8v12l2.7-2.2L9.3 22l2.7-2.2 2.7 2.2 2.6-2.2L20 22V10a8 8 0 00-8-8zm-3 7a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm6 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3z',
    iconRule: 'evenodd',
  },
  [Skills.Grow]: {
    name: '거대화',
    description: '잠시 커져서 좁은 틈은 못 가지만 남을 밀어낸다',
    color: '#f9ca24',
    duration: 2500,
    effectRadius: 4,
    effect: 'grow',
    icon: 'M3 3h7L7.5 5.5 11 9 9 11 5.5 7.5 3 10zM14 3h7v7l-2.5-2.5L15 11l-2-2 3.5-3.5zM3 14l2.5 2.5L9 13l2 2-3.5 3.5L10 21H3zM21 14v7h-7l2.5-2.5L13 15l2-2 3.5 3.5z',
  },
  [Skills.Shrink]: {
    name: '축소',
    description: '잠시 작아져서 좁은 틈을 빠져나간다',
    color: '#00cec9',
    duration: 2500,
    effectRadius: 3,
    effect: 'shrink',
    icon: 'M10 10V4L8 6 4.5 2.5 2.5 4.5 6 8 4 10zM14 10h6l-2-2 3.5-3.5-2-2L16 6l-2-2zM10 14H4l2 2-3.5 3.5 2 2L8 18l2 2zM14 14v6l2-2 3.5 3.5 2-2L18 16l2-2z',
  },
  [Skills.Bouncy]: {
    name: '탱탱볼',
    description: '잠시 고무공처럼 세게 튕긴다',
    color: '#fd79a8',
    duration: 3000,
    effectRadius: 3,
    effect: 'bounce',
    icon: 'M12 3a5 5 0 110 10 5 5 0 010-10zM4 17c2.5 2 5 3 8 3s5.5-1 8-3l1.5 1.5C18.5 21 15.5 22 12 22s-6.5-1-9.5-3.5z',
  },
  [Skills.Brake]: {
    name: '급제동',
    description: '그 자리에서 속도를 거의 다 잃는다',
    color: '#d63031',
    effectRadius: 3,
    effect: 'stop',
    icon: 'M8 2h8l6 6v8l-6 6H8l-6-6V8zm1 3L5 9v6l4 4h6l4-4V9l-4-4z',
    iconRule: 'evenodd',
  },
  [Skills.Swap]: {
    name: '자리바꿈',
    description: '바로 앞에 있는 구슬과 자리를 바꾼다',
    color: '#a29bfe',
    effectRadius: 4,
    effect: 'swap',
    icon: 'M3 8h12l-3-3 1.5-1.5L19 9l-5.5 5.5L12 13l3-3H3zM21 16H9l3 3-1.5 1.5L5 15l5.5-5.5L12 11l-3 3h12z',
  },
  [Skills.Slap]: {
    name: '밀치기',
    description: '바로 앞 구슬을 위로 쳐올린다',
    color: '#e17055',
    effectRadius: 4,
    effect: 'slap',
    icon: 'M8 22h7a4 4 0 004-4v-7a1.5 1.5 0 00-3 0v3h-1V6.5a1.5 1.5 0 00-3 0V14h-1V4.5a1.5 1.5 0 00-3 0V14H7V8a1.5 1.5 0 00-3 0v9l-1.5-1.5a1.5 1.5 0 00-2.1 2.1z',
  },
  [Skills.SlowField]: {
    name: '둔화장',
    description: '주변 구슬의 속도를 확 줄인다',
    color: '#81ecec',
    effectRadius: 6,
    effect: 'slow',
    icon: 'M5 2h14v3l-5 7 5 7v3H5v-3l5-7-5-7zm2 2v.6L11.5 12 7 19.4V20h10v-.6L12.5 12 17 4.6V4z',
    iconRule: 'evenodd',
  },
  [Skills.AntiGravity]: {
    name: '반중력',
    description: '잠깐 중력이 뒤집혀 위로 떠오른다',
    color: '#55efc4',
    duration: 900,
    effectRadius: 3,
    effect: 'rise',
    icon: 'M12 2l7 8h-4v7h-6v-7H5zM4 20h16v2H4z',
  },
  [Skills.Boost]: {
    name: '질주',
    description: '지금 가는 방향으로 속도가 확 붙는다',
    color: '#ffeaa7',
    effectRadius: 3,
    effect: 'boost',
    icon: 'M13 1L3 14h7l-1 9 11-14h-7z',
  },
  [Skills.Zigzag]: {
    name: '지그재그',
    description: '옆으로 튀어 경로가 바뀐다',
    color: '#fab1a0',
    effectRadius: 3,
    effect: 'zigzag',
    icon: 'M3 4h7l-4 5h7l-4 5h7l-3 4 2 2 6-8h-7l4-5h-7l4-5H3z',
  },
  [Skills.Hex]: {
    name: '저주',
    description: '멀리 있는 구슬 하나를 골라 잠시 얼려 버린다',
    color: '#6c5ce7',
    effectRadius: 4,
    effect: 'hex',
    icon: 'M12 2a8 8 0 00-8 8c0 3 1.6 5.5 4 7v3h8v-3c2.4-1.5 4-4 4-7a8 8 0 00-8-8zm-3.5 7a2 2 0 110 4 2 2 0 010-4zm7 0a2 2 0 110 4 2 2 0 010-4zM11 15h2l-1 2z',
    iconRule: 'evenodd',
  },
  [Skills.Titan]: {
    name: '거인',
    description: '잠시 아주 무거워져 남이 밀어내지 못한다',
    color: '#b2bec3',
    duration: 3000,
    effectRadius: 3,
    effect: 'shield',
    icon: 'M12 1l9 4v6c0 5.5-3.8 10.5-9 12-5.2-1.5-9-6.5-9-12V5zm0 3.2L5 7v4c0 4.2 2.8 8.1 7 9.4 4.2-1.3 7-5.2 7-9.4V7z',
    iconRule: 'evenodd',
  },
};

export const ALL_SKILLS: Skills[] = [
  Skills.Impact,
  Skills.Dash,
  Skills.Jump,
  Skills.Feather,
  Skills.Anchor,
  Skills.Magnet,
  Skills.Freeze,
  Skills.Ghost,
  Skills.Grow,
  Skills.Shrink,
  Skills.Bouncy,
  Skills.Brake,
  Skills.Swap,
  Skills.Slap,
  Skills.SlowField,
  Skills.AntiGravity,
  Skills.Boost,
  Skills.Zigzag,
  Skills.Hex,
  Skills.Titan,
];

type SkillOverride = { skill: Skills; name?: string; description?: string; color?: string };

/**
 * 테마별 스킬 세트. 기본 테마는 20종 전부, 나머지는 테마에 어울리는 12종을 골라
 * 이름과 설명을 그 세계관에 맞게 바꾼다. 물리 효과는 같다
 */
export const ThemeSkillSets: Record<string, SkillOverride[]> = {
  dark: ALL_SKILLS.map((skill) => ({ skill })),
  light: ALL_SKILLS.map((skill) => ({ skill })),
  pinball: [
    { skill: Skills.Impact, name: '범퍼 폭발', description: '범퍼처럼 주변 구슬을 튕겨낸다', color: '#ff7043' },
    { skill: Skills.Dash, name: '플런저', description: '플런저로 쏜 것처럼 아래로 가속한다' },
    { skill: Skills.Jump, name: '킥백', description: '킥백 레인처럼 위로 튀어 오른다' },
    { skill: Skills.Zigzag, name: '슬링샷', description: '슬링샷에 맞아 옆으로 튄다' },
    { skill: Skills.Slap, name: '틸트', description: '기계를 흔들어 앞 구슬을 쳐올린다' },
    { skill: Skills.Titan, name: '강철구슬', description: '잠시 무거운 강철구슬이 되어 밀리지 않는다' },
    { skill: Skills.Bouncy, name: '고무구슬', description: '잠시 고무공처럼 세게 튕긴다' },
    { skill: Skills.Magnet, name: '마그넷 세이브', description: '자석으로 주변 구슬을 끌어당긴다' },
    { skill: Skills.Freeze, name: '볼 락', description: '주변 구슬을 그 자리에 잠근다' },
    { skill: Skills.Boost, name: '멀티플라이어', description: '속도가 배로 붙는다', color: '#ffd54f' },
    { skill: Skills.Brake, name: '플리퍼 홀드', description: '플리퍼에 잡힌 듯 그 자리에 멈춘다' },
    { skill: Skills.Swap, name: '볼 체인지', description: '앞 구슬과 자리를 바꾼다' },
  ],
  fantasy: [
    { skill: Skills.Impact, name: '화염구', description: '불덩이를 터뜨려 주변을 밀어낸다', color: '#ff7043' },
    { skill: Skills.Dash, name: '기사 돌격', description: '창을 들고 아래로 돌격한다', color: '#ff6b6b' },
    { skill: Skills.Feather, name: '요정 날개', description: '잠시 날개를 달고 천천히 내려온다', color: '#ffeaa7' },
    { skill: Skills.Anchor, name: '바위 갑옷', description: '잠시 바위처럼 무거워진다', color: '#a4b0be' },
    { skill: Skills.Magnet, name: '마력 흡수', description: '주변 구슬을 끌어당긴다', color: '#e84393' },
    { skill: Skills.Freeze, name: '빙결 마법', description: '주변 구슬을 얼려 세운다', color: '#74b9ff' },
    { skill: Skills.Ghost, name: '투명 망토', description: '잠시 다른 구슬을 통과한다', color: '#dfe6e9' },
    { skill: Skills.Grow, name: '거인화', description: '잠시 거인이 되어 남을 밀어낸다', color: '#f9ca24' },
    { skill: Skills.Shrink, name: '소인술', description: '잠시 작아져 틈을 빠져나간다', color: '#00cec9' },
    { skill: Skills.Swap, name: '순간이동', description: '앞 구슬과 자리를 바꾼다', color: '#a29bfe' },
    { skill: Skills.Hex, name: '저주', description: '멀리 있는 구슬 하나를 얼린다', color: '#6c5ce7' },
    { skill: Skills.SlowField, name: '시간 왜곡', description: '주변의 시간을 느리게 한다', color: '#81ecec' },
  ],
  cyber: [
    { skill: Skills.Freeze, name: 'EMP', description: '주변 구슬의 동력을 끊어 세운다', color: '#00f0ff' },
    { skill: Skills.Dash, name: '부스터', description: '추진기를 켜고 아래로 가속한다', color: '#ff2bd6' },
    { skill: Skills.Jump, name: '제트팩', description: '위로 솟구친다', color: '#54e346' },
    { skill: Skills.AntiGravity, name: '반중력 장치', description: '잠깐 중력이 뒤집힌다', color: '#55efc4' },
    { skill: Skills.Ghost, name: '홀로그램', description: '잠시 실체가 사라져 통과한다', color: '#c8d6e5' },
    { skill: Skills.Magnet, name: '트랙터 빔', description: '주변 구슬을 끌어당긴다', color: '#e84393' },
    { skill: Skills.Grow, name: '나노 확장', description: '잠시 커진다', color: '#f9ca24' },
    { skill: Skills.Swap, name: '텔레포트', description: '앞 구슬과 자리를 바꾼다', color: '#a29bfe' },
    { skill: Skills.Boost, name: '오버클럭', description: '속도가 확 붙는다', color: '#ffeaa7' },
    { skill: Skills.Hex, name: '해킹', description: '멀리 있는 구슬 하나를 멈춘다', color: '#6c5ce7' },
    { skill: Skills.Titan, name: '방벽 필드', description: '잠시 밀리지 않는 방벽을 두른다', color: '#7dfcff' },
    { skill: Skills.Impact, name: '충격파', description: '주변 구슬을 밀어낸다', color: '#ff9f43' },
  ],
  doodle: [
    { skill: Skills.Ghost, name: '지우개', description: '잠시 지워져서 통과한다', color: '#b2bec3' },
    { skill: Skills.Dash, name: '연필 돌진', description: '연필 끝처럼 아래로 찌른다', color: '#e17055' },
    { skill: Skills.Jump, name: '스프링', description: '스프링처럼 위로 튄다', color: '#00b894' },
    { skill: Skills.Feather, name: '풍선', description: '잠시 풍선을 달고 천천히 내려온다', color: '#fd79a8' },
    { skill: Skills.Anchor, name: '벽돌', description: '잠시 벽돌처럼 무거워진다', color: '#d63031' },
    { skill: Skills.Magnet, name: '자석', description: '주변 구슬을 끌어당긴다', color: '#e84393' },
    { skill: Skills.Freeze, name: '얼음 낙서', description: '주변 구슬을 얼린다', color: '#0984e3' },
    { skill: Skills.Impact, name: '물감 폭탄', description: '물감이 터져 주변을 밀어낸다', color: '#fdcb6e' },
    { skill: Skills.Grow, name: '뻥튀기', description: '잠시 뻥 커진다', color: '#f9ca24' },
    { skill: Skills.Shrink, name: '쪼그라들기', description: '잠시 쪼그라들어 틈을 지나간다', color: '#00cec9' },
    { skill: Skills.Bouncy, name: '고무공', description: '잠시 고무공처럼 튕긴다', color: '#6c5ce7' },
    { skill: Skills.Hex, name: '낙서 저주', description: '멀리 있는 구슬 하나에 낙서해 멈춘다', color: '#2d3436' },
  ],
};

export interface SkillView extends SkillDef {
  skill: Skills;
}

function themeSet(themeName: string): SkillOverride[] {
  return ThemeSkillSets[themeName] ?? ThemeSkillSets.dark;
}

/** 테마의 스킬 세트를 기본 정의와 합쳐 돌려준다 */
export function getSkillPool(themeName: string = options.themeName): SkillView[] {
  return themeSet(themeName).map((o) => ({ ...SkillDefs[o.skill], ...stripUndefined(o), skill: o.skill }));
}

/** 한 스킬의 테마 반영 정보. 세트에 없는 스킬이면 기본 정의 */
export function getSkillView(skill: Skills, themeName: string = options.themeName): SkillView {
  const override = themeSet(themeName).find((o) => o.skill === skill);
  return { ...SkillDefs[skill], ...(override ? stripUndefined(override) : {}), skill };
}

function stripUndefined(o: SkillOverride): Partial<SkillOverride> {
  const out: Partial<SkillOverride> = {};
  if (o.name) out.name = o.name;
  if (o.description) out.description = o.description;
  if (o.color) out.color = o.color;
  return out;
}

const pathCache = new Map<Skills, Path2D>();

function iconPath(skill: Skills): Path2D {
  let path = pathCache.get(skill);
  if (!path) {
    path = new Path2D(SkillDefs[skill].icon);
    pathCache.set(skill, path);
  }
  return path;
}

/**
 * 스킬 배지(색 원 + 흰 그림)를 중심 (cx, cy)에 size 픽셀 크기로 그린다.
 * 호출 전에 화면 픽셀 단위 변환을 잡아 두어야 한다
 */
export function drawSkillBadge(
  ctx: CanvasRenderingContext2D,
  skill: Skills,
  cx: number,
  cy: number,
  size: number,
  themeName?: string
) {
  const view = getSkillView(skill, themeName);
  if (!view.icon) return;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = view.color;
  ctx.fill();
  ctx.lineWidth = Math.max(1, size * 0.07);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.stroke();
  const inset = size * 0.17;
  const scale = (size - inset * 2) / 24;
  ctx.translate(inset, inset);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#ffffff';
  ctx.fill(iconPath(skill), view.iconRule ?? 'nonzero');
  ctx.restore();
}

/**
 * 배지 없이 그림만 그린다. 구슬 안에 크게 넣을 때 쓴다.
 * (cx, cy)가 그림 중심, size가 그림의 한 변 길이. 호출 시점의 좌표계 단위를 그대로 따른다
 */
export function drawSkillGlyph(
  ctx: CanvasRenderingContext2D,
  skill: Skills,
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  const def = SkillDefs[skill];
  if (!def.icon) return;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.fillStyle = color;
  ctx.fill(iconPath(skill), def.iconRule ?? 'nonzero');
  ctx.restore();
}

/** HTML(능력표 창)용 인라인 SVG 배지 */
export function skillBadgeSvg(view: SkillView, size = 22): string {
  return (
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" class="badge">` +
    `<circle cx="12" cy="12" r="11.5" fill="${view.color}" stroke="rgba(0,0,0,0.45)" stroke-width="1"/>` +
    `<g transform="translate(4 4) scale(0.667)"><path d="${view.icon}" fill="#fff" fill-rule="${view.iconRule ?? 'nonzero'}"/></g>` +
    `</svg>`
  );
}
