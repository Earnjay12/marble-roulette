import type { StageDef } from './data/maps';
import type { MapEntityState } from './types/MapEntity.type';

export interface IPhysics {
  init(): Promise<void>;

  clear(): void;

  clearMarbles(): void;

  createStage(stage: StageDef): void;

  createMarble(id: number, x: number, y: number): void;

  shakeMarble(id: number): void;

  removeMarble(id: number): void;

  getMarblePosition(id: number): { x: number; y: number; angle: number };

  getEntities(): MapEntityState[];

  /** 주변 구슬을 밀어낸다 (폭발) */
  impact(id: number): void;

  /** 주변 구슬을 끌어당긴다 (자석) */
  attract(id: number, power?: number): void;

  /** 주변 구슬을 피하는 조향 (깃털). 매 프레임 부른다 */
  avoidMarbles(id: number, radius: number, deltaSeconds: number): void;

  /** 구슬 하나를 그 자리에 멈춘다 */
  freezeMarble(id: number): void;

  /** 구슬 자신에게 충격량을 준다. y가 양수면 아래쪽. 질량에 비례해 체감 속도를 맞춘다 */
  applyImpulse(id: number, x: number, y: number): void;

  /** 자기 속도를 factor 배로 */
  scaleVelocity(id: number, factor: number): void;

  getVelocity(id: number): { x: number; y: number };

  setVelocity(id: number, x: number, y: number): void;

  /** 구슬을 그 자리로 순간 이동 */
  teleport(id: number, x: number, y: number): void;

  /** 중력 배율. 1이 보통, 작으면 깃털, 크면 무게추 */
  setGravityScale(id: number, scale: number): void;

  /** 벽·장애물·구슬을 전부 통과한다 (유령) */
  setGhost(id: number, ghost: boolean): void;

  /** 장애물(못·범퍼·풍차)만 통과한다. 벽과 구슬에는 부딪힌다 (거대화) */
  setPassObstacles(id: number, pass: boolean): void;

  /** 구슬 반지름 변경 */
  setRadius(id: number, radius: number): void;

  /** 구슬 탄성 변경 (탱탱볼). 0이 기본 */
  setRestitution(id: number, restitution: number): void;

  /** 선분이 처음 부딪히는 지점의 비율(0~1). 안 부딪히면 1. wallsOnly면 벽(꺾은선)만 본다 */
  rayFraction(x1: number, y1: number, x2: number, y2: number, wallsOnly?: boolean): number;

  /** 반지름 radius인 구슬이 선분을 따라 막힘 없이 갈 수 있는 비율(0~1) */
  clearFraction(x1: number, y1: number, x2: number, y2: number, radius: number): number;

  /** 코스 안쪽인지(좌우에 벽이 있는지) */
  isInsideCourse(x: number, y: number): boolean;

  /** 반지름 r인 원이 벽이나 장애물과 겹쳐 있는지 */
  overlapsEntity(x: number, y: number, r: number): boolean;

  /** 앞(아래)에 있는 가장 가까운 구슬과 자리를 바꾼다. 바꿨으면 그 구슬 id */
  swapWithMarbleAhead(id: number, maxDistance: number): number | null;

  /** 앞(아래)에 있는 가장 가까운 구슬에 충격량을 준다. 맞은 구슬 id */
  pushMarbleAhead(id: number, maxDistance: number, impulseY: number): number | null;

  /** 잠깐 놓이는 둥근 장애물(분신). 손잡이 번호를 돌려준다 */
  createTempObstacle(x: number, y: number, radius: number): number;

  removeTempObstacle(handle: number): void;

  start(): void;

  step(deltaSeconds: number): void;
}
