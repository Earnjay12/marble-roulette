import Box2DFactory from 'box2d-wasm';
import { MARBLE_RADIUS } from './data/constants';
import type { StageDef } from './data/maps';
import type { IPhysics } from './IPhysics';
import type { MapEntity, MapEntityState } from './types/MapEntity.type';

/**
 * box2d 충돌 필터 비트. 벽(꺾은선)은 기본값 0x0001, 구슬은 0x0002,
 * 못·범퍼·풍차 같은 장애물(상자·원)은 0x0004. 거대화는 장애물만, 유령은 전부 통과한다
 */
const WALL_CATEGORY = 0x0001;
const MARBLE_CATEGORY = 0x0002;
const OBSTACLE_CATEGORY = 0x0004;
const COLLIDE_ALL = 0xffff;

export class Box2dPhysics implements IPhysics {
  private Box2D!: typeof Box2D & EmscriptenModule;
  private gravity!: Box2D.b2Vec2;
  private world!: Box2D.b2World;

  private marbleMap: { [id: number]: Box2D.b2Body } = {};
  /** 구슬마다 밀도가 달라서(1~2) 거인 스킬이 끝나면 원래 값으로 돌려놓아야 한다 */
  private baseDensity: { [id: number]: number } = {};
  private entities: ({ body: Box2D.b2Body } & MapEntityState)[] = [];

  private deleteCandidates: Box2D.b2Body[] = [];

  /** 유령(전부 통과)·거대화(장애물 통과) 상태인 구슬 */
  private ghostIds = new Set<number>();
  private passObstacleIds = new Set<number>();

  /** 레이캐스트용으로 한 번만 만들어 재사용한다. wasm 객체를 매번 만들면 메모리가 샌다 */
  private rayInput!: Box2D.b2RayCastInput;
  private rayOutput!: Box2D.b2RayCastOutput;

  async init(): Promise<void> {
    this.Box2D = await Box2DFactory();
    this.gravity = new this.Box2D.b2Vec2(0, 10);
    this.world = new this.Box2D.b2World(this.gravity);
    // 이 두 구조체는 box2d-wasm에 생성자가 없다. 크기만큼 메모리를 잡아 감싸서 쓴다
    // (입력: p1·p2 각 8바이트 + maxFraction 4바이트, 출력: normal 8바이트 + fraction 4바이트)
    this.rayInput = this.Box2D.wrapPointer(this.Box2D._malloc(20), this.Box2D.b2RayCastInput);
    this.rayOutput = this.Box2D.wrapPointer(this.Box2D._malloc(12), this.Box2D.b2RayCastOutput);
    this.scratch = new this.Box2D.b2Vec2(0, 0);
    this.scratch2 = new this.Box2D.b2Vec2(0, 0);
    console.log('box2d ready');
  }

  /**
   * wasm 쪽 객체는 자바스크립트가 자동으로 치워 주지 않는다. 매 프레임 new b2Vec2를 만들면
   * 메모리가 계속 쌓여 결국 물리 엔진이 멈춘다. box2d는 넘겨받은 벡터를 복사하므로 하나를 돌려 쓴다
   */
  private scratch!: Box2D.b2Vec2;
  private scratch2!: Box2D.b2Vec2;

  private vec(x: number, y: number): Box2D.b2Vec2 {
    this.scratch.Set(x, y);
    return this.scratch;
  }

  /** 두 벡터가 동시에 필요할 때(선분 양 끝)의 두 번째 */
  private vec2(x: number, y: number): Box2D.b2Vec2 {
    this.scratch2.Set(x, y);
    return this.scratch2;
  }

  clear(): void {
    this.clearEntities();
  }

  clearMarbles(): void {
    Object.values(this.marbleMap).forEach((body) => {
      this.world.DestroyBody(body);
    });
    this.marbleMap = {};
    this.baseDensity = {};
    this.ghostIds.clear();
    this.passObstacleIds.clear();
  }

  createStage(stage: StageDef): void {
    this.createEntities(stage.entities);
  }

  createEntities(entities?: MapEntity[]) {
    if (!entities) return;

    const bodyTypes = {
      static: this.Box2D.b2_staticBody,
      kinematic: this.Box2D.b2_kinematicBody,
    } as const;

    entities.forEach((entity) => {
      const bodyDef = new this.Box2D.b2BodyDef();
      bodyDef.set_type(bodyTypes[entity.type]);
      const body = this.world.CreateBody(bodyDef);

      const fixtureDef = new this.Box2D.b2FixtureDef();
      fixtureDef.set_density(entity.props.density);
      fixtureDef.set_restitution(entity.props.restitution);
      fixtureDef.get_filter().set_categoryBits(OBSTACLE_CATEGORY);

      // 만든 정의·도형은 box2d가 복사해 가므로 다 쓰고 나면 바로 지운다
      switch (entity.shape.type) {
        case 'box': {
          const shape = new this.Box2D.b2PolygonShape();
          shape.SetAsBox(entity.shape.width, entity.shape.height, 0, entity.shape.rotation);
          fixtureDef.set_shape(shape);
          body.CreateFixture(fixtureDef);
          this.Box2D.destroy(shape);
          break;
        }
        case 'polyline': {
          const edge = new this.Box2D.b2EdgeShape();
          for (let i = 0; i < entity.shape.points.length - 1; i++) {
            const p1 = entity.shape.points[i];
            const p2 = entity.shape.points[i + 1];
            edge.SetTwoSided(this.vec(p1[0], p1[1]), this.vec2(p2[0], p2[1]));
            body.CreateFixture(edge, 1);
          }
          this.Box2D.destroy(edge);
          break;
        }
        case 'circle': {
          const shape = new this.Box2D.b2CircleShape();
          shape.set_m_radius(entity.shape.radius);
          fixtureDef.set_shape(shape);
          body.CreateFixture(fixtureDef);
          this.Box2D.destroy(shape);
          break;
        }
      }
      this.Box2D.destroy(fixtureDef);
      this.Box2D.destroy(bodyDef);

      body.SetAngularVelocity(entity.props.angularVelocity);
      body.SetTransform(this.vec(entity.position.x, entity.position.y), 0);
      this.entities.push({
        body,
        x: entity.position.x,
        y: entity.position.y,
        angle: 0,
        shape: entity.shape,
        life: entity.props.life ?? -1,
      });
    });
  }

  clearEntities() {
    this.entities.forEach((entity) => {
      this.world.DestroyBody(entity.body);
    });
    this.entities = [];
  }

  createMarble(id: number, x: number, y: number): void {
    const bodyDef = new this.Box2D.b2BodyDef();
    bodyDef.set_type(this.Box2D.b2_dynamicBody);
    bodyDef.set_position(this.vec(x, y));

    const body = this.world.CreateBody(bodyDef);
    this.Box2D.destroy(bodyDef);
    this.baseDensity[id] = 1 + Math.random();
    this.attachMarbleFixture(body, MARBLE_RADIUS, this.baseDensity[id], 0, COLLIDE_ALL);
    body.SetAwake(false);
    body.SetEnabled(false);
    this.marbleMap[id] = body;
  }

  /** 구슬 픽스처를 만든다. 반지름·탄성이 바뀔 때 기존 것을 떼고 다시 붙이는 데도 쓴다 */
  private attachMarbleFixture(body: Box2D.b2Body, radius: number, density: number, restitution: number, mask: number) {
    const circleShape = new this.Box2D.b2CircleShape();
    circleShape.set_m_radius(radius);
    const fixtureDef = new this.Box2D.b2FixtureDef();
    fixtureDef.set_shape(circleShape);
    fixtureDef.set_density(density);
    fixtureDef.set_restitution(restitution);
    // 구슬끼리만 구분되는 카테고리를 준다. 유령 스킬이 다른 구슬과의 충돌만 끌 수 있게
    fixtureDef.get_filter().set_categoryBits(MARBLE_CATEGORY);
    fixtureDef.get_filter().set_maskBits(mask);
    body.CreateFixture(fixtureDef);
    this.Box2D.destroy(fixtureDef);
    this.Box2D.destroy(circleShape);
  }

  shakeMarble(id: number): void {
    const body = this.marbleMap[id];
    if (body) {
      body.ApplyLinearImpulseToCenter(this.vec(Math.random() * 10 - 5, Math.random() * 10 - 5), true);
    }
  }

  removeMarble(id: number): void {
    const marble = this.marbleMap[id];
    if (marble) {
      this.world.DestroyBody(marble);
      delete this.marbleMap[id];
      delete this.baseDensity[id];
      this.ghostIds.delete(id);
      this.passObstacleIds.delete(id);
    }
  }

  getMarblePosition(id: number): { x: number; y: number; angle: number } {
    const marble = this.marbleMap[id];
    if (marble) {
      const pos = marble.GetPosition();
      return { x: pos.x, y: pos.y, angle: marble.GetAngle() };
    } else {
      return { x: 0, y: 0, angle: 0 };
    }
  }

  getEntities(): MapEntityState[] {
    return this.entities.map((entity) => {
      return {
        ...entity,
        angle: entity.body.GetAngle(),
      };
    });
  }

  impact(id: number): void {
    const src = this.marbleMap[id];
    if (!src) return;

    Object.values(this.marbleMap).forEach((body) => {
      if (body === src) return;

      const distVector = this.vec(body.GetPosition().x, body.GetPosition().y);
      distVector.op_sub(src.GetPosition());
      const distSq = distVector.LengthSquared();

      if (distSq < 100) {
        distVector.Normalize();
        const power = 1 - distVector.Length() / 10;
        distVector.op_mul(power * power * 5);
        body.ApplyLinearImpulseToCenter(distVector, true);
      }
    });
  }

  attract(id: number, power = 3): void {
    const src = this.marbleMap[id];
    if (!src) return;

    Object.values(this.marbleMap).forEach((body) => {
      if (body === src) return;
      const toSrc = this.vec(src.GetPosition().x, src.GetPosition().y);
      toSrc.op_sub(body.GetPosition());
      const distSq = toSrc.LengthSquared();
      if (distSq < 100 && distSq > 0.01) {
        const strength = 1 - Math.sqrt(distSq) / 10;
        toSrc.Normalize();
        toSrc.op_mul(power * strength);
        body.ApplyLinearImpulseToCenter(toSrc, true);
      }
    });
  }

  /** 주변 구슬을 피하는 조향. 가까운 구슬일수록 세게 반대쪽으로 밀고, 떨어지는 속도도 묶어 둔다 */
  avoidMarbles(id: number, radius: number, deltaSeconds: number): void {
    const src = this.marbleMap[id];
    if (!src) return;
    const p = src.GetPosition();
    let ax = 0;
    let ay = 0;
    Object.values(this.marbleMap).forEach((body) => {
      if (body === src) return;
      const q = body.GetPosition();
      const dx = p.x - q.x;
      const dy = p.y - q.y;
      const d = Math.hypot(dx, dy);
      if (d > radius || d < 0.001) return;
      const w = (1 - d / radius) ** 2;
      ax += (dx / d) * w;
      ay += (dy / d) * w;
    });
    const v = src.GetLinearVelocity();
    let vx = v.x + ax * 60 * deltaSeconds;
    let vy = v.y + ay * 30 * deltaSeconds;
    vx *= 0.97;
    vy = Math.min(vy, 2.5);
    src.SetLinearVelocity(this.vec(vx, vy));
    src.SetAwake(true);
  }

  getVelocity(id: number): { x: number; y: number } {
    const body = this.marbleMap[id];
    if (!body) return { x: 0, y: 0 };
    const v = body.GetLinearVelocity();
    return { x: v.x, y: v.y };
  }

  setVelocity(id: number, x: number, y: number): void {
    const body = this.marbleMap[id];
    if (!body) return;
    body.SetLinearVelocity(this.vec(x, y));
    body.SetAwake(true);
  }

  teleport(id: number, x: number, y: number): void {
    const body = this.marbleMap[id];
    if (!body) return;
    body.SetTransform(this.vec(x, y), body.GetAngle());
    body.SetAwake(true);
  }

  /** 맵의 모든 장애물 픽스처를 돈다 */
  private forEachEntityFixture(fn: (fixture: Box2D.b2Fixture) => void) {
    for (const entity of this.entities) {
      let f = entity.body.GetFixtureList();
      while (this.Box2D.getPointer(f) !== 0) {
        fn(f);
        f = f.GetNext();
      }
    }
  }

  /** (x1,y1)→(x2,y2) 선분이 처음 부딪히는 지점의 비율(0~1). 안 부딪히면 1 */
  rayFraction(x1: number, y1: number, x2: number, y2: number, wallsOnly = false): number {
    const input = this.rayInput;
    input.set_p1(this.vec(x1, y1));
    input.set_p2(this.vec(x2, y2));
    input.set_maxFraction(1);
    let best = 1;
    this.forEachEntityFixture((f) => {
      if (wallsOnly && f.GetFilterData().get_categoryBits() !== WALL_CATEGORY) return;
      if (f.RayCast(this.rayOutput, input, 0)) {
        best = Math.min(best, this.rayOutput.get_fraction());
      }
    });
    return best;
  }

  /** 반지름 radius인 구슬이 선분을 따라 지나갈 때 막히지 않는 거리 비율. 가운데와 양옆 세 줄로 잰다 */
  clearFraction(x1: number, y1: number, x2: number, y2: number, radius: number): number {
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const nx = (-(y2 - y1) / len) * radius;
    const ny = ((x2 - x1) / len) * radius;
    return Math.min(
      this.rayFraction(x1, y1, x2, y2),
      this.rayFraction(x1 + nx, y1 + ny, x2 + nx, y2 + ny),
      this.rayFraction(x1 - nx, y1 - ny, x2 - nx, y2 - ny)
    );
  }

  /** 코스 안쪽인지. 좌우로 벽이 하나씩은 있어야 안쪽이다 */
  isInsideCourse(x: number, y: number): boolean {
    return this.rayFraction(x, y, x - 30, y, true) < 1 && this.rayFraction(x, y, x + 30, y, true) < 1;
  }

  /** 반지름 r인 원이 벽이나 장애물과 겹쳐 있는지 */
  overlapsEntity(x: number, y: number, r: number): boolean {
    const p = this.vec(x, y);
    let hit = false;
    this.forEachEntityFixture((f) => {
      if (!hit && f.TestPoint(p)) hit = true;
    });
    if (hit) return true;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      if (this.rayFraction(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r) < 1) return true;
    }
    return false;
  }

  freezeMarble(id: number): void {
    const body = this.marbleMap[id];
    if (!body) return;
    body.SetLinearVelocity(this.vec(0, 0));
    body.SetAngularVelocity(0);
  }

  applyImpulse(id: number, x: number, y: number): void {
    const body = this.marbleMap[id];
    if (!body) return;
    const mass = body.GetMass();
    body.ApplyLinearImpulseToCenter(this.vec(x * mass, y * mass), true);
  }

  scaleVelocity(id: number, factor: number): void {
    const body = this.marbleMap[id];
    if (!body) return;
    const v = body.GetLinearVelocity();
    body.SetLinearVelocity(this.vec(v.x * factor, v.y * factor));
    body.SetAwake(true);
  }

  setGravityScale(id: number, scale: number): void {
    const body = this.marbleMap[id];
    if (!body) return;
    body.SetGravityScale(scale);
    body.SetAwake(true);
  }

  /** 유령: 벽·장애물·구슬 전부 통과 */
  setGhost(id: number, ghost: boolean): void {
    if (ghost) this.ghostIds.add(id);
    else this.ghostIds.delete(id);
    this.applyMask(id);
  }

  /** 거대화: 벽과 구슬에는 부딪히고 장애물은 통과 */
  setPassObstacles(id: number, pass: boolean): void {
    if (pass) this.passObstacleIds.add(id);
    else this.passObstacleIds.delete(id);
    this.applyMask(id);
  }

  private maskFor(id: number): number {
    if (this.ghostIds.has(id)) return 0;
    if (this.passObstacleIds.has(id)) return COLLIDE_ALL & ~OBSTACLE_CATEGORY;
    return COLLIDE_ALL;
  }

  private applyMask(id: number) {
    const body = this.marbleMap[id];
    if (!body) return;
    const fixture = body.GetFixtureList();
    const filter = fixture.GetFilterData();
    filter.set_maskBits(this.maskFor(id));
    fixture.SetFilterData(filter);
    body.SetAwake(true);
  }

  setRadius(id: number, radius: number): void {
    const body = this.marbleMap[id];
    if (!body) return;
    // box2d는 만들어진 원의 반지름을 바꿀 수 없어서 픽스처를 떼고 다시 붙인다.
    // 유령 상태(충돌 마스크)와 탄성은 그대로 이어받는다
    const old = body.GetFixtureList();
    const mask = old.GetFilterData().get_maskBits();
    const restitution = old.GetRestitution();
    const density = old.GetDensity();
    body.DestroyFixture(old);
    this.attachMarbleFixture(body, radius, density, restitution, mask);
    body.SetAwake(true);
  }

  setRestitution(id: number, restitution: number): void {
    const body = this.marbleMap[id];
    if (!body) return;
    body.GetFixtureList().SetRestitution(restitution);
  }

  setMassScale(id: number, scale: number): void {
    const body = this.marbleMap[id];
    if (!body) return;
    body.GetFixtureList().SetDensity(this.baseDensity[id] * scale);
    body.ResetMassData();
  }

  private nearestAhead(id: number, maxDistance: number): { id: number; body: Box2D.b2Body } | null {
    const src = this.marbleMap[id];
    if (!src) return null;
    const sy = src.GetPosition().y;
    let best: { id: number; body: Box2D.b2Body } | null = null;
    let bestDist = maxDistance;
    for (const key of Object.keys(this.marbleMap)) {
      const otherId = Number(key);
      if (otherId === id) continue;
      const body = this.marbleMap[otherId];
      const p = body.GetPosition();
      // "앞"은 더 아래(골에 가까운 쪽). 나란히 떨어지는 구슬(같은 높이)도 대상에 넣는다
      if (p.y < sy - 0.3) continue;
      const d = Math.hypot(p.x - src.GetPosition().x, p.y - sy);
      if (d < bestDist) {
        bestDist = d;
        best = { id: otherId, body };
      }
    }
    return best;
  }

  swapWithMarbleAhead(id: number, maxDistance: number): number | null {
    const src = this.marbleMap[id];
    const target = this.nearestAhead(id, maxDistance);
    if (!src || !target) return null;
    const a = src.GetPosition();
    const b = target.body.GetPosition();
    const ax = a.x;
    const ay = a.y;
    src.SetTransform(this.vec(b.x, b.y), src.GetAngle());
    target.body.SetTransform(this.vec(ax, ay), target.body.GetAngle());
    src.SetAwake(true);
    target.body.SetAwake(true);
    return target.id;
  }

  pushMarbleAhead(id: number, maxDistance: number, impulseY: number): number | null {
    const target = this.nearestAhead(id, maxDistance);
    if (!target) return null;
    const mass = target.body.GetMass();
    target.body.ApplyLinearImpulseToCenter(this.vec(0, impulseY * mass), true);
    return target.id;
  }

  start(): void {
    for (const key in this.marbleMap) {
      const marble = this.marbleMap[key];
      marble.SetAwake(true);
      marble.SetEnabled(true);
    }
  }

  step(deltaSeconds: number): void {
    this.deleteCandidates.forEach((body) => {
      this.world.DestroyBody(body);
    });
    this.deleteCandidates = [];

    this.world.Step(deltaSeconds, 6, 2);

    for (let i = this.entities.length - 1; i >= 0; i--) {
      const entity = this.entities[i];
      if (entity.life > 0) {
        const edge = entity.body.GetContactList();
        if (edge.contact?.IsTouching()) {
          this.deleteCandidates.push(entity.body);
          this.entities.splice(i, 1);
        }
      }
    }
  }
}
