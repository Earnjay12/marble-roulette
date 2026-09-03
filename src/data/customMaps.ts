import type { MapEntity } from '../types/MapEntity.type';
import type { StageDef } from './maps';

/**
 * 직접 만든 맵들. 손으로 좌표를 나열하는 대신 작은 헬퍼로 조립한다.
 *
 * 좌표계: x는 0~26(미니맵 폭), y는 아래로 갈수록 커진다. 구슬은 x 10~16, y 1~5 근처에서 생성되므로
 * 모든 맵은 위쪽에 x 9~17 통로를 두고 y 8.5부터 본 코스로 이어진다. box의 width/height는 절반 크기
 * (half extent), rotation은 라디안이고 양수면 화면에서 시계 방향으로 기운다(오른쪽 끝이 내려간다).
 * 구슬 반지름은 0.25.
 *
 * 재미의 원칙(원본 맵에서 배운 것):
 * - 폭은 10칸 안팎으로 좁게. 넓으면 장애물을 피해 그냥 떨어진다.
 * - 벽을 타고 내려가는 직선 통로를 남기지 않는다. 벽에 안쪽으로 기운 톱니를 붙인다.
 * - 풍차는 6~10 rad/s로 빠르게. 범퍼는 restitution 1.3 이상. 거품(life)은 라운드마다 코스를 바꾼다.
 * - 출구 목에서 천천히 도는 막대가 도착 순서를 마지막에 한 번 더 섞는다.
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

/**
 * 노란 거품. 구슬이 닿으면 터져서 사라진다(life). 원본 버블팝과 같은 규칙이라
 * "노란 원 = 터지는 것"으로 통일한다. 안 터지는 범퍼가 필요하면 diamond를 쓴다
 */
function bubble(x: number, y: number, radius: number, restitution = 1.4): MapEntity {
  return {
    type: 'static',
    position: { x, y },
    props: { density: 1, angularVelocity: 0, restitution, life: 1 },
    shape: { type: 'circle', radius },
  };
}

/** 터지지 않는 큰 마름모 범퍼. size는 절반 크기(대각선 반지름은 size×1.41) */
function diamond(x: number, y: number, size: number, restitution = 1.3): MapEntity {
  return peg(x, y, size, restitution);
}

/**
 * 벽에 붙은 톱니. 벽을 타고 내려오는 구슬을 가운데로 튕겨낸다.
 * length 2.2, angle 0.6이면 안쪽으로 1.8칸, 아래로 1.2칸 뻗는다
 */
function teeth(
  left: number,
  right: number,
  ys: number[],
  side: 'left' | 'right' | 'both' = 'both',
  length = 2.2,
  angle = 0.6
): MapEntity[] {
  const half = length / 2;
  const dx = half * Math.cos(angle);
  const dy = half * Math.sin(angle);
  const out: MapEntity[] = [];
  for (const y of ys) {
    if (side !== 'right') out.push(plate(left + dx, y + dy, half, angle, 0.3));
    if (side !== 'left') out.push(plate(right - dx, y + dy, half, -angle, 0.3));
  }
  return out;
}

/** 생성 통로 바로 아래의 소형 풍차 두 개. 뭉쳐서 떨어지는 구슬 더미를 첫 순간부터 흩는다 */
function openingMixers(): MapEntity[] {
  return [spinner(11.5, 11, 0.6, 10), spinner(14.5, 11, 0.6, -10)];
}

/**
 * 출구 목에서 천천히 도는 막대. 원본 첫 맵의 마지막 바퀴와 같은 장치로, 깔때기에 모인 구슬을
 * 막았다 풀었다 하며 도착 순서를 뒤섞는다. 중심은 왼쪽 경사면 바깥에 두고 끝만 목을 쓸고 지나간다
 */
function gateWheel(goalY: number, speed = 1.3, exitLeft = 12): MapEntity {
  return spinner(exitLeft - 1.1, goalY - 1.5, 2.2, speed);
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
// 1. 지그재그 폭포: 좁은 협곡에서 짧고 가파른 경사면을 번갈아 타고, 낙하 지점마다 풍차에 맞는다
// ---------------------------------------------------------------------------
function zigzagFalls(): StageDef {
  const goalY = 94;
  const left = 8;
  const right = 18;
  const entities: MapEntity[] = [
    ...outerWalls({ left, right, widenAt: 14, funnelAt: goalY - 5.5, goalY }),
    ...openingMixers(),
  ];

  const tilt = 0.45; // 약 26도
  const half = 3.25; // 길이 6.5. 폭 10에서 반대쪽에 4칸 낙하 구간이 남는다
  const dx = half * Math.cos(tilt);
  const rows = [18, 26, 34, 42, 50, 58, 66];
  rows.forEach((y, i) => {
    const fromLeft = i % 2 === 0;
    entities.push(fromLeft ? plate(left + dx, y, half, tilt) : plate(right - dx, y, half, -tilt));
    // 낙하 구간: 빠른 풍차가 떨어지는 구슬을 아무 방향으로나 쳐내고, 못 두 개가 한 번 더 흔든다
    const gapCenter = fromLeft ? right - 2 : left + 2;
    entities.push(spinner(gapCenter, y + 3.2, 1.1, fromLeft ? 8 : -8));
    entities.push(peg(gapCenter - 1.1, y + 5.8, 0.2, 0.8), peg(gapCenter + 1.1, y + 5.8, 0.2, 0.8));
  });

  // 경사면이 끝난 뒤 범퍼 삼각형과 톱니.
  // 톱니는 못·범퍼와 높이를 겹치면 안 된다. 톱니 윗면과 못 사이에 구슬이 끼어 멈춘 적이 있다
  entities.push(diamond(10.5, 76, 0.65), diamond(15.5, 76, 0.65), diamond(13, 81, 0.75));
  entities.push(...teeth(left, right, [70, 85]));
  entities.push(gateWheel(goalY, 1.3));

  return { title: 'Zigzag Falls', goalY, zoomY: goalY - 4.5, entities };
}

// ---------------------------------------------------------------------------
// 2. 핀볼 정원: 벽까지 꽉 채운 못 격자 → 터지는 거품 → 풍차와 범퍼
// ---------------------------------------------------------------------------
function pinballGarden(): StageDef {
  const goalY = 96;
  const left = 8;
  const right = 18;
  const entities: MapEntity[] = [
    ...outerWalls({ left, right, widenAt: 14, funnelAt: goalY - 5.5, goalY }),
    ...openingMixers(),
  ];

  // 못은 벽에서 1.4칸 띄운다. 벽에 너무 붙이면 벽과 못의 비스듬한 면 사이에 V자 홈이 생겨
  // 구슬이 끼어 멈춘다. 벽을 타고 내려오는 구슬은 격자 사이에 끼워 넣은 톱니가 안쪽으로 밀어낸다
  entities.push(
    ...pegGrid({ xStart: 9.4, xEnd: 16.6, yStart: 19, rows: 14, colGap: 1.8, rowGap: 2.2, size: 0.2, restitution: 0.7 })
  );
  // 못 줄(2.2칸 간격) 사이 빈틈에 정확히 들어가는 높이. 못과 겹치면 또 홈이 된다
  entities.push(...teeth(left, right, [23.9, 32.7, 41.5]));

  // 터지는 거품. 앞선 구슬이 터뜨린 자리를 뒤 구슬은 그냥 지나가므로 라운드마다 다르다
  const bubbles: [number, number][] = [
    [9.5, 52],
    [12, 52],
    [14.5, 52],
    [17, 52],
    [10.75, 56],
    [13.25, 56],
    [15.75, 56],
  ];
  bubbles.forEach(([x, y]) => entities.push(bubble(x, y, 0.6)));

  entities.push(...teeth(left, right, [60, 72]));
  entities.push(spinner(10.5, 65, 1.4, 8), spinner(15.5, 65, 1.4, -8));
  entities.push(diamond(13, 71, 0.7), diamond(9.8, 77, 0.6), diamond(16.2, 77, 0.6));
  entities.push(...teeth(left, right, [82]));
  entities.push(gateWheel(goalY, 1.3));

  return { title: 'Pinball Garden', goalY, zoomY: goalY - 4.5, entities };
}

// ---------------------------------------------------------------------------
// 3. 풍차 마을: 폭을 거의 다 쓰는 빠른 풍차가 층층이 돌고, 벽 옆은 톱니가 막는다
// ---------------------------------------------------------------------------
function windmillVillage(): StageDef {
  const goalY = 100;
  const left = 8;
  const right = 18;
  const entities: MapEntity[] = [
    ...outerWalls({ left, right, widenAt: 14, funnelAt: goalY - 5.5, goalY }),
    ...openingMixers(),
  ];

  const speeds = [6, 8, 7, 9, 6, 8, 7, 9, 6];
  const rows = [18, 25, 32, 39, 46, 53, 60, 67, 74];
  rows.forEach((y, i) => {
    const speed = speeds[i] * (i % 4 < 2 ? 1 : -1);
    if (i % 2 === 0) {
      // 큰 풍차 하나가 가운데 4.8칸을 쓸고, 양쪽 벽 톱니가 나머지를 막는다
      entities.push(spinner(13, y, 2.4, speed));
      entities.push(...teeth(left, right, [y - 1.2]));
    } else {
      // 작은 풍차 둘 사이에 큰 못
      entities.push(spinner(10.5, y, 1.5, -speed), spinner(15.5, y, 1.5, speed));
      entities.push(peg(13, y, 0.35, 0.8));
    }
  });

  entities.push(diamond(11, 82, 0.65), diamond(15, 82, 0.65));
  entities.push(...teeth(left, right, [86]));
  entities.push(gateWheel(goalY, 1.3));

  return { title: 'Windmill Village', goalY, zoomY: goalY - 4.5, entities };
}

// ---------------------------------------------------------------------------
// 4. 모래시계 계단: 깔때기가 모으고, 목의 풍차가 흩뿌리고, 범퍼가 다시 벌린다. 이걸 네 번 반복
// ---------------------------------------------------------------------------
function hourglassStairs(): StageDef {
  const goalY = 100;
  const left = 4;
  const right = 22;
  const entities: MapEntity[] = [
    ...outerWalls({ left, right, widenAt: 14, funnelAt: goalY - 7, goalY }),
    ...openingMixers(),
  ];

  // [윗변 y, 아랫변 y, 틈 왼쪽 x, 틈 오른쪽 x]. 틈 위치를 가운데→왼쪽→오른쪽→가운데로 옮긴다
  const funnels: [number, number, number, number][] = [
    [18, 26, 11.75, 14.25],
    [34, 42, 6, 8.5],
    [50, 58, 17.5, 20],
    [66, 74, 11.75, 14.25],
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
    // 목 바로 아래의 빠른 풍차. 틈보다 길어서 구슬을 막았다가 아무 방향으로나 던진다
    const center = (gapL + gapR) / 2;
    entities.push(spinner(center, bottom + 1.4, 1.4, i % 2 === 0 ? 9 : -9));
    // 그 아래 마름모 범퍼 세 개가 구슬을 다시 폭 전체로 벌려 놓는다. 벽에서 2칸은 띄운다(끼임 방지)
    const bx = [center - 4, center, center + 4].map((x) => Math.min(right - 2, Math.max(left + 2, x)));
    bx.forEach((x, j) => entities.push(diamond(x, bottom + 5.5 + (j === 1 ? 1.5 : 0), 0.6)));
  });

  // 한 번 맞으면 터지는 거품 밭
  const bubbles: [number, number][] = [
    [6, 79],
    [9, 79],
    [12, 79],
    [15, 79],
    [18, 79],
    [21, 79],
    [7.5, 82.5],
    [10.5, 82.5],
    [13.5, 82.5],
    [16.5, 82.5],
    [19.5, 82.5],
  ];
  bubbles.forEach(([x, y]) => entities.push(bubble(x, y, 0.7, 1.5)));

  entities.push(...teeth(left, right, [87]));
  entities.push(gateWheel(goalY, 1.3));

  return { title: 'Hourglass Stairs', goalY, zoomY: goalY - 4.5, entities };
}

export const customStages: StageDef[] = [zigzagFalls(), pinballGarden(), windmillVillage(), hourglassStairs()];
