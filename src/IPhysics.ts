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

  /** 반지름 안의 다른 구슬을 그 자리에 멈춘다 (얼음) */
  freezeAround(id: number, radius: number): void;

  /** 반지름 안의 다른 구슬 속도를 factor 배로 줄인다 (둔화장) */
  slowAround(id: number, radius: number, factor: number): void;

  /** 구슬 하나를 그 자리에 멈춘다 */
  freezeMarble(id: number): void;

  /** 구슬 자신에게 충격량을 준다. y가 양수면 아래쪽. 질량에 비례해 체감 속도를 맞춘다 */
  applyImpulse(id: number, x: number, y: number): void;

  /** 자기 속도를 factor 배로 (급제동·질주) */
  scaleVelocity(id: number, factor: number): void;

  /** 중력 배율. 1이 보통, 작으면 깃털, 크면 무게추, 음수면 반중력 */
  setGravityScale(id: number, scale: number): void;

  /** 다른 구슬과 부딪히지 않게 한다 (유령). 벽과는 계속 부딪힌다 */
  setGhost(id: number, ghost: boolean): void;

  /** 구슬 반지름 변경 (거대화·축소) */
  setRadius(id: number, radius: number): void;

  /** 구슬 탄성 변경 (탱탱볼). 0이 기본 */
  setRestitution(id: number, restitution: number): void;

  /** 질량 배율 (거인). 1이 기본 */
  setMassScale(id: number, scale: number): void;

  /** 앞(아래)에 있는 가장 가까운 구슬과 자리를 바꾼다. 바꿨으면 그 구슬 id */
  swapWithMarbleAhead(id: number, maxDistance: number): number | null;

  /** 앞(아래)에 있는 가장 가까운 구슬에 충격량을 준다. 맞은 구슬 id */
  pushMarbleAhead(id: number, maxDistance: number, impulseY: number): number | null;

  start(): void;

  step(deltaSeconds: number): void;
}
