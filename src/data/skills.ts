import options from '../options';
import { Skills } from './constants';

/** 발동 이펙트의 종류. skillEffect.ts가 이 값으로 입자·링 모양을 고른다 */
export type EffectKind =
  | 'burst'
  | 'dash'
  | 'float'
  | 'drop'
  | 'pull'
  | 'frost'
  | 'fade'
  | 'grow'
  | 'bounce'
  | 'swap'
  | 'slap'
  | 'slow'
  | 'hex'
  | 'teleport'
  | 'beam'
  | 'timestop'
  | 'grip'
  | 'web'
  | 'thunder'
  | 'smash'
  | 'clone'
  | 'punch'
  | 'repulsor'
  | 'ice'
  | 'shield'
  | 'shadow'
  | 'gun';

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

/** 스킬 기본 정의. 테마별 세트가 이름·설명·색을 덮어쓸 수 있다 */
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
    name: '번개 돌진',
    description: '장애물을 피해 번개처럼 다섯 번 연속으로 꺾어 달린다',
    color: '#ffe066',
    effectRadius: 2,
    effect: 'dash',
    icon: 'M13 1L3 14h7l-1 9 11-14h-7z',
  },
  [Skills.Gun]: {
    name: '총격',
    description: '가까운 구슬들에게 총알을 연사해 날려 버린다',
    color: '#ff4757',
    effectRadius: 2,
    effect: 'gun',
    icon: 'M11 1h2v4h-2zM11 19h2v4h-2zM1 11h4v2H1zM19 11h4v2h-4zM12 6a6 6 0 110 12 6 6 0 010-12zm0 2a4 4 0 100 8 4 4 0 000-8zm0 3a1 1 0 110 2 1 1 0 010-2z',
    iconRule: 'evenodd',
  },
  [Skills.Feather]: {
    name: '깃털',
    description: '천천히 내려오며 다른 구슬을 스르륵 피해 간다',
    color: '#dfe6e9',
    duration: 3000,
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
    description: '잠시 벽과 장애물까지 통과해 아래로 빠져나간다',
    color: '#c8d6e5',
    duration: 1000,
    effectRadius: 3,
    effect: 'fade',
    icon: 'M12 2a8 8 0 00-8 8v12l2.7-2.2L9.3 22l2.7-2.2 2.7 2.2 2.6-2.2L20 22V10a8 8 0 00-8-8zm-3 7a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm6 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3z',
    iconRule: 'evenodd',
  },
  [Skills.Grow]: {
    name: '거대화',
    description: '커져서 범퍼·풍차·못을 무시하고 밀고 내려간다',
    color: '#f9ca24',
    duration: 2500,
    effectRadius: 4,
    effect: 'grow',
    icon: 'M3 3h7L7.5 5.5 11 9 9 11 5.5 7.5 3 10zM14 3h7v7l-2.5-2.5L15 11l-2-2 3.5-3.5zM3 14l2.5 2.5L9 13l2 2-3.5 3.5L10 21H3zM21 14v7h-7l2.5-2.5L13 15l2-2 3.5 3.5z',
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
    name: '둔화탄',
    description: '1등에게 둔화 구체를 던져 1등과 그 주변을 느리게 만든다',
    color: '#81ecec',
    effectRadius: 3.5,
    effect: 'slow',
    icon: 'M5 2h14v3l-5 7 5 7v3H5v-3l5-7-5-7zm2 2v.6L11.5 12 7 19.4V20h10v-.6L12.5 12 17 4.6V4z',
    iconRule: 'evenodd',
  },
  [Skills.Hex]: {
    name: '저주',
    description: '나보다 앞선 구슬 하나를 골라 잠시 멈춰 버린다',
    color: '#6c5ce7',
    effectRadius: 4,
    effect: 'hex',
    icon: 'M12 2a8 8 0 00-8 8c0 3 1.6 5.5 4 7v3h8v-3c2.4-1.5 4-4 4-7a8 8 0 00-8-8zm-3.5 7a2 2 0 110 4 2 2 0 010-4zm7 0a2 2 0 110 4 2 2 0 010-4zM11 15h2l-1 2z',
    iconRule: 'evenodd',
  },
  [Skills.Teleport]: {
    name: '순간이동',
    description: '1등 바로 옆으로 순식간에 이동한다',
    color: '#ffb142',
    effectRadius: 1.5,
    effect: 'teleport',
    icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 3a7 7 0 110 14 7 7 0 010-14zm0 3a4 4 0 100 8 4 4 0 000-8z',
    iconRule: 'evenodd',
  },
  [Skills.Beam]: {
    name: '기공포',
    description: '기를 모아 광선을 쏴서 맞은 구슬들을 날려 버린다',
    color: '#4fc3f7',
    effectRadius: 2,
    effect: 'beam',
    icon: 'M2 10h11v4H2zM17 6a6 6 0 110 12 6 6 0 010-12z',
  },
  [Skills.TimeStop]: {
    name: '시간 정지',
    description: '다른 모든 구슬의 시간을 잠시 멈추고 혼자 움직인다',
    color: '#f6e58d',
    effectRadius: 3,
    effect: 'timestop',
    icon: 'M12 1a11 11 0 110 22 11 11 0 010-22zm0 2.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17zM11 6h2v5.4l3.8 2.2-1 1.7-4.8-2.8z',
    iconRule: 'evenodd',
  },
  [Skills.ForceGrip]: {
    name: '포스 그립',
    description: '앞서가는 구슬 하나를 허공으로 들어 올려 붙잡는다',
    color: '#c56cf0',
    effectRadius: 2,
    effect: 'grip',
    icon: 'M8 22h7a4 4 0 004-4v-7a1.5 1.5 0 00-3 0v3h-1V6.5a1.5 1.5 0 00-3 0V14h-1V4.5a1.5 1.5 0 00-3 0V14H7V8a1.5 1.5 0 00-3 0v9l-1.5-1.5a1.5 1.5 0 00-2.1 2.1z',
  },
  [Skills.WebSwing]: {
    name: '웹스윙',
    description: '앞쪽 벽에 거미줄을 쏴서 끌려가듯 날아간다',
    color: '#ff3838',
    effectRadius: 2,
    effect: 'web',
    icon: 'M11 1h2v22h-2zM1 11h22v2H1zM4.2 5.6l1.4-1.4 14.2 14.2-1.4 1.4zM18.4 4.2l1.4 1.4L5.6 19.8l-1.4-1.4zM12 6a6 6 0 110 12 6 6 0 010-12zm0 1.6a4.4 4.4 0 100 8.8 4.4 4.4 0 000-8.8z',
    iconRule: 'evenodd',
  },
  [Skills.Thunder]: {
    name: '천둥 망치',
    description: '1등에게 벼락을 내리쳐 멈추고 주변 구슬을 날린다',
    color: '#7ed6ff',
    effectRadius: 2.5,
    effect: 'thunder',
    icon: 'M3 2h14v7H3zM8 9h4v13H8zM18 3l3 0-2 4h2l-4 6 1-4h-2z',
  },
  [Skills.Smash]: {
    name: '스매시',
    description: '아래로 내리꽂혀서 착지 충격파로 주변을 날린다',
    color: '#2ecc71',
    effectRadius: 3.5,
    effect: 'smash',
    icon: 'M5 9a2 2 0 014 0V8a2 2 0 014 0v1a2 2 0 014 0v1a2 2 0 014 0v4c0 4.4-3.6 8-8 8h-2c-3.9 0-7-3.1-7-7v-3a2 2 0 011-1.7z',
  },
  [Skills.Clone]: {
    name: '분신술',
    description: '뒤쪽에 분신 둘을 남겨 따라오는 구슬을 막는다',
    color: '#ff9f1a',
    effectRadius: 2,
    effect: 'clone',
    icon: 'M9 4a6 6 0 110 12A6 6 0 019 4zm6 4a6 6 0 110 12 6 6 0 010-12z',
    iconRule: 'evenodd',
  },
  [Skills.RubberPunch]: {
    name: '고무 펀치',
    description: '팔을 쭉 뻗어 앞 구슬을 끌어당기고 그 반동으로 튀어 나간다',
    color: '#e84118',
    effectRadius: 2,
    effect: 'punch',
    icon: 'M4 8h12a3 3 0 013 3v4a5 5 0 01-5 5H8a4 4 0 01-4-4zM2 10h2v6H2zM6 4h3v4H6zm4 0h3v4h-3zm4 1h3v3h-3z',
  },
  [Skills.Repulsor]: {
    name: '리펄서',
    description: '아래로 빔을 쏴 떠오른 뒤 뚫린 쪽으로 빠르게 날아간다',
    color: '#00d2d3',
    effectRadius: 2,
    effect: 'repulsor',
    icon: 'M12 2a5 5 0 110 10 5 5 0 010-10zM10 13h4l1 9H9z',
  },
  [Skills.IceBridge]: {
    name: '얼음 다리',
    description: '지나간 자리에 얼음길을 깔아 뒤따르는 구슬을 미끄러뜨린다',
    color: '#a5f3fc',
    duration: 1500,
    effectRadius: 2,
    effect: 'ice',
    icon: 'M2 20L22 8v4L2 22zM15 3l1.5 3 3 1.5-3 1.5L15 12l-1.5-3-3-1.5 3-1.5z',
  },
  [Skills.ShieldThrow]: {
    name: '방패 던지기',
    description: '원반 방패를 던져 구슬 셋을 연달아 맞힌다',
    color: '#e74c3c',
    effectRadius: 2,
    effect: 'shield',
    icon: 'M12 1a11 11 0 110 22 11 11 0 010-22zm0 3a8 8 0 100 16 8 8 0 000-16zm0 3l1.5 3.2 3.5.4-2.6 2.4.7 3.5L12 15.8 8.9 17.5l.7-3.5L7 11.6l3.5-.4z',
    iconRule: 'evenodd',
  },
  [Skills.ShadowStep]: {
    name: '그림자 이동',
    description: '앞 구슬의 그림자로 사라졌다가 그 구슬 바로 앞에 나타난다',
    color: '#636e72',
    effectRadius: 2,
    effect: 'shadow',
    icon: 'M14 2a10 10 0 100 20A8 8 0 0114 2z',
  },
};

export const ALL_SKILLS: Skills[] = [
  Skills.Impact,
  Skills.Gun,
  Skills.Feather,
  Skills.Anchor,
  Skills.Magnet,
  Skills.Freeze,
  Skills.Ghost,
  Skills.Grow,
  Skills.Bouncy,
  Skills.Swap,
  Skills.Slap,
  Skills.SlowField,
  Skills.Hex,
];

type SkillOverride = { skill: Skills; name?: string; description?: string; color?: string };

/**
 * 테마별 스킬 세트. 기본 테마는 전부, 핀볼은 어울리는 8종을 골라 핀볼 용어로 이름을 바꾼다.
 * 물리 효과는 같다
 */
export const ThemeSkillSets: Record<string, SkillOverride[]> = {
  dark: ALL_SKILLS.map((skill) => ({ skill })),
  light: ALL_SKILLS.map((skill) => ({ skill })),
  pinball: [
    { skill: Skills.Impact, name: '범퍼 폭발', description: '범퍼처럼 주변 구슬을 튕겨낸다', color: '#ff7043' },
    { skill: Skills.Gun, name: '볼 슈터', description: '가까운 구슬들에게 쇠구슬을 연사한다' },
    { skill: Skills.Slap, name: '틸트', description: '기계를 흔들어 앞 구슬을 쳐올린다' },
    { skill: Skills.Bouncy, name: '고무구슬', description: '잠시 고무공처럼 세게 튕긴다' },
    { skill: Skills.Magnet, name: '마그넷 세이브', description: '자석으로 주변 구슬을 끌어당긴다' },
    { skill: Skills.Freeze, name: '볼 락', description: '주변 구슬을 그 자리에 잠근다' },
    { skill: Skills.Swap, name: '볼 체인지', description: '앞 구슬과 자리를 바꾼다' },
    { skill: Skills.Grow, name: '점보볼', description: '커져서 범퍼와 플리퍼를 무시하고 내려간다' },
  ],
  // 오마주 팩: 여러 작품 속 기술에서 영감을 받았다. 테마와 상관없이 이 목록을 쓴다
  anime: [
    { skill: Skills.Dash, name: '뇌광 질주', description: '번개처럼 다섯 번 꺾어 장애물 사이를 내달린다' },
    { skill: Skills.Teleport },
    { skill: Skills.Beam },
    { skill: Skills.TimeStop },
    { skill: Skills.ForceGrip },
    { skill: Skills.WebSwing },
    { skill: Skills.Thunder },
    { skill: Skills.Smash },
    { skill: Skills.Clone },
    { skill: Skills.RubberPunch },
    { skill: Skills.Repulsor },
    { skill: Skills.IceBridge },
    { skill: Skills.ShieldThrow },
    { skill: Skills.ShadowStep },
  ],
};

export interface SkillView extends SkillDef {
  skill: Skills;
}

/** 오마주 팩이면 테마와 상관없이 오마주 목록, 아니면 테마의 목록 */
function themeSet(themeName: string): SkillOverride[] {
  if (options.skillPack === 'anime') return ThemeSkillSets.anime;
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
