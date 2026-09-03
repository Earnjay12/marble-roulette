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
  attract(id: number): void;

  /** 반지름 안의 다른 구슬을 그 자리에 멈춘다 (얼음) */
  freezeAround(id: number, radius: number): void;

  /** 구슬 자신에게 충격량을 준다. y가 양수면 아래쪽 */
  applyImpulse(id: number, x: number, y: number): void;

  /** 중력 배율. 1이 보통, 작으면 깃털, 크면 무게추 */
  setGravityScale(id: number, scale: number): void;

  /** 다른 구슬과 부딪히지 않게 한다 (유령). 벽과는 계속 부딪힌다 */
  setGhost(id: number, ghost: boolean): void;

  start(): void;

  step(deltaSeconds: number): void;
}
