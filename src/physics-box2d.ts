import Box2DFactory from 'box2d-wasm';
import { MARBLE_RADIUS } from './data/constants';
import type { StageDef } from './data/maps';
import type { IPhysics } from './IPhysics';
import type { MapEntity, MapEntityState } from './types/MapEntity.type';

/** box2d 충돌 필터 비트. 벽·장애물은 기본값(0x0001), 구슬은 0x0002 */
const MARBLE_CATEGORY = 0x0002;
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

  async init(): Promise<void> {
    this.Box2D = await Box2DFactory();
    this.gravity = new this.Box2D.b2Vec2(0, 10);
    this.world = new this.Box2D.b2World(this.gravity);
    console.log('box2d ready');
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

      let shape;
      switch (entity.shape.type) {
        case 'box':
          shape = new this.Box2D.b2PolygonShape();
          shape.SetAsBox(entity.shape.width, entity.shape.height, 0, entity.shape.rotation);
          fixtureDef.set_shape(shape);
          body.CreateFixture(fixtureDef);
          break;
        case 'polyline':
          shape = new this.Box2D.b2EdgeShape();
          for (let i = 0; i < entity.shape.points.length - 1; i++) {
            const p1 = entity.shape.points[i];
            const p2 = entity.shape.points[i + 1];
            const v1 = new this.Box2D.b2Vec2(p1[0], p1[1]);
            const v2 = new this.Box2D.b2Vec2(p2[0], p2[1]);
            const edge = new this.Box2D.b2EdgeShape();
            edge.SetTwoSided(v1, v2);
            body.CreateFixture(edge, 1);
          }
          break;
        case 'circle':
          shape = new this.Box2D.b2CircleShape();
          shape.set_m_radius(entity.shape.radius);
          fixtureDef.set_shape(shape);
          body.CreateFixture(fixtureDef);
          break;
      }

      body.SetAngularVelocity(entity.props.angularVelocity);
      body.SetTransform(new this.Box2D.b2Vec2(entity.position.x, entity.position.y), 0);
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
    bodyDef.set_position(new this.Box2D.b2Vec2(x, y));

    const body = this.world.CreateBody(bodyDef);
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
  }

  shakeMarble(id: number): void {
    const body = this.marbleMap[id];
    if (body) {
      body.ApplyLinearImpulseToCenter(new this.Box2D.b2Vec2(Math.random() * 10 - 5, Math.random() * 10 - 5), true);
    }
  }

  removeMarble(id: number): void {
    const marble = this.marbleMap[id];
    if (marble) {
      this.world.DestroyBody(marble);
      delete this.marbleMap[id];
      delete this.baseDensity[id];
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

      const distVector = new this.Box2D.b2Vec2(body.GetPosition().x, body.GetPosition().y);
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

  attract(id: number): void {
    const src = this.marbleMap[id];
    if (!src) return;

    Object.values(this.marbleMap).forEach((body) => {
      if (body === src) return;
      const toSrc = new this.Box2D.b2Vec2(src.GetPosition().x, src.GetPosition().y);
      toSrc.op_sub(body.GetPosition());
      const distSq = toSrc.LengthSquared();
      if (distSq < 100 && distSq > 0.01) {
        const power = 1 - Math.sqrt(distSq) / 10;
        toSrc.Normalize();
        toSrc.op_mul(power * 3);
        body.ApplyLinearImpulseToCenter(toSrc, true);
      }
    });
  }

  freezeAround(id: number, radius: number): void {
    this.forEachAround(id, radius, (body) => {
      body.SetLinearVelocity(new this.Box2D.b2Vec2(0, 0));
      body.SetAngularVelocity(0);
    });
  }

  slowAround(id: number, radius: number, factor: number): void {
    this.forEachAround(id, radius, (body) => {
      const v = body.GetLinearVelocity();
      body.SetLinearVelocity(new this.Box2D.b2Vec2(v.x * factor, v.y * factor));
    });
  }

  private forEachAround(id: number, radius: number, fn: (body: Box2D.b2Body) => void) {
    const src = this.marbleMap[id];
    if (!src) return;
    Object.values(this.marbleMap).forEach((body) => {
      if (body === src) return;
      const d = new this.Box2D.b2Vec2(body.GetPosition().x, body.GetPosition().y);
      d.op_sub(src.GetPosition());
      if (d.LengthSquared() < radius * radius) fn(body);
    });
  }

  freezeMarble(id: number): void {
    const body = this.marbleMap[id];
    if (!body) return;
    body.SetLinearVelocity(new this.Box2D.b2Vec2(0, 0));
    body.SetAngularVelocity(0);
  }

  applyImpulse(id: number, x: number, y: number): void {
    const body = this.marbleMap[id];
    if (!body) return;
    const mass = body.GetMass();
    body.ApplyLinearImpulseToCenter(new this.Box2D.b2Vec2(x * mass, y * mass), true);
  }

  scaleVelocity(id: number, factor: number): void {
    const body = this.marbleMap[id];
    if (!body) return;
    const v = body.GetLinearVelocity();
    body.SetLinearVelocity(new this.Box2D.b2Vec2(v.x * factor, v.y * factor));
    body.SetAwake(true);
  }

  setGravityScale(id: number, scale: number): void {
    const body = this.marbleMap[id];
    if (!body) return;
    body.SetGravityScale(scale);
    body.SetAwake(true);
  }

  setGhost(id: number, ghost: boolean): void {
    const body = this.marbleMap[id];
    if (!body) return;
    const fixture = body.GetFixtureList();
    const filter = fixture.GetFilterData();
    filter.set_maskBits(ghost ? COLLIDE_ALL & ~MARBLE_CATEGORY : COLLIDE_ALL);
    fixture.SetFilterData(filter);
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
      // "앞"은 더 아래(골에 가까운 쪽)
      if (p.y <= sy) continue;
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
    src.SetTransform(new this.Box2D.b2Vec2(b.x, b.y), src.GetAngle());
    target.body.SetTransform(new this.Box2D.b2Vec2(ax, ay), target.body.GetAngle());
    src.SetAwake(true);
    target.body.SetAwake(true);
    return target.id;
  }

  pushMarbleAhead(id: number, maxDistance: number, impulseY: number): number | null {
    const target = this.nearestAhead(id, maxDistance);
    if (!target) return null;
    const mass = target.body.GetMass();
    target.body.ApplyLinearImpulseToCenter(new this.Box2D.b2Vec2(0, impulseY * mass), true);
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
