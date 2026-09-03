import type { MapEntity } from '../types/MapEntity.type';
import type { StageDef } from './maps';

/**
 * 직접 만든 맵들. 손으로 좌표를 나열하는 대신 작은 헬퍼로 조립한다.
 *
 * 좌표계: x는 0~26(미니맵 폭), y는 아래로 갈수록 커진다. 구슬은 x 10~16, y 1~5 근처에서 생성되므로
 * 모든 맵은 위쪽에 x 9~17 통로를 두고 y 8.5부터 넓어진다. box의 width/height는 절반 크기(half extent),
 * rotation은 라디안이고 양수면 화면에서 시계 방향으로 기운다(오른쪽 끝이 내려간다). 구슬 반지름은 0.25.
 */

const NO_PROPS = { density: 1, angularVelocity: 0, restitution: 0 };

/** 벽·경사면. 열린 꺾은선이며 구슬은 어느 쪽에서든 부딪힌다 */
function wall(points: [number, number][], restitution = 0): MapEntity {
  return {
    type: 'static',
    position: { x: 0, y: 0 },
    props: { ...NO_PROPS, restitution },
    shape: { type: 'polyline', rotation: 0, points },
  };
}

/** 마름모 못(핀볼 핀). size는 절반 크기 */
function peg(x: number, y: number, size = 0.2, restitution = 0.5): MapEntity {
  return {
    type: 'static',
    position: { x, y },
    props: { ...NO_PROPS, restitution },
    shape: { type: 'box', width: size, height: size, rotation: Math.PI / 4 },
  };
}

/** 고정된 판. halfLength가 절반 길이, angle이 기울기(라디안) */
function plate(x: number, y: number, halfLength: number, angle: number, restitution = 0, thickness = 0.12): MapEntity {
  return {
    type: 'static',
    position: { x, y },
    props: { ...NO_PROPS, restitution },
    shape: { type: 'box', width: halfLength, height: thickness, rotation: angle },
  };
}

/** 회전하는 막대(풍차). speed는 각속도(rad/s), 양수면 시계 방향 */
function spinner(x: number, y: number, halfLength: number, speed: number): MapEntity {
  return {
    type: 'kinematic',
    position: { x, y },
    props: { density: 1, angularVelocity: speed, restitution: 0 },
    shape: { type: 'box', width: halfLength, height: 0.1, rotation: 0 },
  };
}

/** 튕기는 범퍼. life를 주면 그 횟수만큼 맞고 사라지는 거품이 된다 */
function bumper(x: number, y: number, radius: number, restitution = 1.2, life?: number): MapEntity {
  return {
    type: 'static',
    position: { x, y },
    props: { density: 1, angularVelocity: 0, restitution, ...(life ? { life } : {}) },
    shape: { type: 'circle', radius },
  };
}

/** 위쪽 생성 통로(x 9~17)에서 시작해 좌우 벽을 따라 내려가 바닥 깔때기와 출구까지 이어지는 양쪽 벽 */
function outerWalls(opts: {
  left: number;
  right: number;
  widenAt: number;
  funnelAt: number;
  goalY: number;
  exitLeft?: number;
  exitWidth?: number;
}): MapEntity[] {
  const { left, right, widenAt, funnelAt, goalY } = opts;
  const exitLeft = opts.exitLeft ?? 12;
  const exitRight = exitLeft + (opts.exitWidth ?? 1.1);
  const exitTop = goalY - 1.5;
  return [
    wall([
      [9, -300],
      [9, 8.5],
      [left, widenAt],
      [left, funnelAt],
      [exitLeft, exitTop],
      [exitLeft, goalY + 1],
    ]),
    wall([
      [17, -300],
      [17, 8.5],
      [right, widenAt],
      [right, funnelAt],
      [exitRight, exitTop],
      [exitRight, goalY + 1],
    ]),
  ];
}

/** 엇갈린 못 격자(갈톤 보드) */
function pegGrid(opts: {
  xStart: number;
  xEnd: number;
  yStart: number;
  rows: number;
  colGap: number;
  rowGap: number;
  size?: number;
  restitution?: number;
}): MapEntity[] {
  const pegs: MapEntity[] = [];
  for (let r = 0; r < opts.rows; r++) {
    const offset = r % 2 === 0 ? 0 : opts.colGap / 2;
    for (let x = opts.xStart + offset; x <= opts.xEnd + 0.001; x += opts.colGap) {
      pegs.push(peg(x, opts.yStart + r * opts.rowGap, opts.size, opts.restitution));
    }
  }
  return pegs;
}

// ---------------------------------------------------------------------------
// 1. 지그재그 폭포: 좌우로 번갈아 기운 긴 경사면을 타고 내려간다
// ---------------------------------------------------------------------------
function zigzagFalls(): StageDef {
  const goalY = 92;
  const entities: MapEntity[] = [...outerWalls({ left: 2, right: 24, widenAt: 14, funnelAt: 82, goalY })];

  const tilt = 0.25; // 약 14도. 더 완만하면 한 판에 4초 넘게 걸려 지루하다
  const half = 8;
  // 경사면 중심 y. 왼쪽 벽에서 시작해 오른쪽으로 내려가는 판과 그 반대를 번갈아 둔다
  const rampRows = [19, 33, 47, 61];
  rampRows.forEach((y, i) => {
    const toRight = i % 2 === 0;
    // 판 끝이 벽에 닿도록 중심을 잡는다 (길이 16, 벽 안쪽 폭 22 → 반대쪽에 6칸 낙하 구간)
    const cx = toRight ? 2 + half : 24 - half;
    entities.push(plate(cx, y, half, toRight ? tilt : -tilt));
    // 낙하 구간에 못 몇 개를 흩어 두어 떨어지는 방향을 흔든다
    const dropX = toRight ? 21 : 5;
    entities.push(peg(dropX - 1.2, y + 6), peg(dropX + 1.2, y + 6), peg(dropX, y + 8.5));
  });

  // 경사면 바로 위에서 돌아가는 풍차. 굴러가는 구슬을 쳐서 순서를 뒤섞는다.
  // 더 빠르면 구슬을 경사면 위쪽으로 되던져서 마지막 골인이 한참 늦어진다
  entities.push(spinner(14, 32, 1.6, 1.5), spinner(12, 45.9, 1.6, -1.5));

  // 마지막 갈톤 보드
  entities.push(...pegGrid({ xStart: 4, xEnd: 22, yStart: 71, rows: 3, colGap: 3, rowGap: 2.6 }));

  return { title: 'Zigzag Falls', goalY, zoomY: goalY - 4.5, entities };
}

// ---------------------------------------------------------------------------
// 2. 핀볼 정원: 촘촘한 못 격자 → 범퍼 삼각형 → 풍차
// ---------------------------------------------------------------------------
function pinballGarden(): StageDef {
  const goalY = 110;
  const entities: MapEntity[] = [...outerWalls({ left: 3, right: 23, widenAt: 14, funnelAt: 100, goalY })];

  entities.push(...pegGrid({ xStart: 4.6, xEnd: 21.4, yStart: 18, rows: 22, colGap: 2.4, rowGap: 2.6, size: 0.18 }));

  // 못 격자 아래 범퍼 삼각형. 세게 튕겨서 순위를 뒤집는다
  entities.push(bumper(13, 80, 1.0, 1.3), bumper(8.5, 86, 0.9, 1.3), bumper(17.5, 86, 0.9, 1.3));

  // 범퍼 사이로 빠진 구슬을 흔드는 풍차
  entities.push(spinner(6, 94, 1.4, 6), spinner(13, 96, 1.6, -4), spinner(20, 94, 1.4, 6));

  return { title: 'Pinball Garden', goalY, zoomY: goalY - 4.5, entities };
}

// ---------------------------------------------------------------------------
// 3. 풍차 마을: 풍차가 층층이 돌아가는 사이를 빠져나간다
// ---------------------------------------------------------------------------
function windmillVillage(): StageDef {
  const goalY = 122;
  const entities: MapEntity[] = [...outerWalls({ left: 2, right: 24, widenAt: 14, funnelAt: 112, goalY })];

  const rows = [20, 32, 44, 56, 68, 80, 92];
  rows.forEach((y, i) => {
    const xs = i % 2 === 0 ? [7, 13, 19] : [10, 16];
    const speed = 2 + (i % 3);
    xs.forEach((x, j) => entities.push(spinner(x, y, 2.1, (j % 2 === 0 ? 1 : -1) * speed)));
    // 벽 쪽으로 몰린 구슬을 가운데로 돌려보내는 마름모
    const dy = y + 6;
    if (i % 2 === 0) {
      entities.push(peg(4, dy, 0.9, 0.3), peg(22, dy, 0.9, 0.3));
    } else {
      entities.push(peg(13, dy, 0.9, 0.3));
    }
  });

  entities.push(...pegGrid({ xStart: 4, xEnd: 22, yStart: 102, rows: 3, colGap: 3, rowGap: 2.6 }));

  return { title: 'Windmill Village', goalY, zoomY: goalY - 4.5, entities };
}

// ---------------------------------------------------------------------------
// 4. 모래시계 계단: 깔때기를 여러 번 통과하며 매번 좁은 틈으로 모인다
// ---------------------------------------------------------------------------
function hourglassStairs(): StageDef {
  const goalY = 104;
  const left = 1.5;
  const right = 24.5;
  const entities: MapEntity[] = [...outerWalls({ left, right, widenAt: 14, funnelAt: 94, goalY })];

  // [윗변 y, 아랫변 y, 틈 왼쪽 x, 틈 오른쪽 x]. 틈 위치를 가운데→왼쪽→오른쪽→가운데로 옮긴다
  const funnels: [number, number, number, number][] = [
    [18, 26, 11.5, 14.5],
    [32, 40, 4, 7],
    [46, 54, 19, 22],
    [60, 68, 11.5, 14.5],
  ];
  funnels.forEach(([top, bottom, gapL, gapR], i) => {
    entities.push(
      wall([
        [left, top],
        [gapL, bottom],
      ]),
      wall([
        [right, top],
        [gapR, bottom],
      ])
    );
    // 틈 바로 아래 풍차가 떨어지는 구슬을 흩뿌린다
    entities.push(spinner((gapL + gapR) / 2, bottom + 2.2, 1.2, i % 2 === 0 ? 7 : -7));
  });

  // 거품 범퍼: 한 번 맞으면 터진다
  const bubbles: [number, number][] = [
    [7, 76],
    [11, 76],
    [15, 76],
    [19, 76],
    [9, 80],
    [13, 80],
    [17, 80],
  ];
  bubbles.forEach(([x, y]) => entities.push(bumper(x, y, 0.7, 1.5, 1)));

  entities.push(...pegGrid({ xStart: 4, xEnd: 22, yStart: 86, rows: 3, colGap: 3, rowGap: 2.4 }));

  return { title: 'Hourglass Stairs', goalY, zoomY: goalY - 4.5, entities };
}

export const customStages: StageDef[] = [zigzagFalls(), pinballGarden(), windmillVillage(), hourglassStairs()];
