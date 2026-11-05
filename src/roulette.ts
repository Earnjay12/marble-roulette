import { Camera } from './camera';
import { canvasHeight, canvasWidth, initialZoom, MARBLE_RADIUS, Skills, Themes, zoomThreshold } from './data/constants';
import { type StageDef, stages } from './data/maps';
import { getSkillPool, getSkillView, skillBadgeSvg } from './data/skills';
import { FastForwader } from './fastForwader';
import type { GameObject } from './gameObject';
import type { IPhysics } from './IPhysics';
import { GROW_RADIUS, Marble } from './marble';
import { Minimap } from './minimap';
import options, { type WinnerRange } from './options';
import { ParticleManager } from './particleManager';
import { Box2dPhysics } from './physics-box2d';
import { RankRenderer } from './rankRenderer';
import { RouletteRenderer } from './rouletteRenderer';
import { LightningTrail, Projectile, SkillEffect } from './skillEffect';
import type { ColorTheme } from './types/ColorTheme';
import type { MouseEventHandlerName, MouseEventName } from './types/mouseEvents.type';
import type { UIObject } from './UIObject';
import { bound } from './utils/bound.decorator';
import { parseName, shuffle } from './utils/utils';
import { VideoRecorder } from './utils/videoRecorder';

/** 입력 범위를 실제 구슬 수에 맞춰 자른다. 범위를 넘기면 뒤쪽이 잘린다 */
function clipWinnerRange({ start, end }: WinnerRange, marbleCount: number): WinnerRange {
  const last = Math.max(0, marbleCount - 1);
  const clippedStart = Math.min(Math.max(0, start), last);
  return { start: clippedStart, end: Math.min(Math.max(clippedStart, end), last) };
}

export class Roulette extends EventTarget {
  private _marbles: Marble[] = [];

  private _lastTime: number = 0;
  private _elapsed: number = 0;

  private _updateInterval = 10;
  private _timeScale = 1;
  private _speed = 1;

  private _winners: Marble[] = [];
  private _particleManager = new ParticleManager();
  private _stage: StageDef | null = null;

  protected _camera: Camera = new Camera();
  protected _renderer: RouletteRenderer;

  private _effects: GameObject[] = [];
  /** 스킬이 예약해 둔 후속 동작(연속 대시·연사). 시뮬레이션 시간으로 흐른다 */
  private _tasks: { delay: number; run: () => void }[] = [];

  private _winnerRange: WinnerRange = { start: 0, end: 0 };
  private _goalDist: number = Infinity;
  private _isRunning: boolean = false;
  /** 진행 중에는 null, 당첨자가 모두 확정되면 당첨자 배열 */
  private _result: Marble[] | null = null;

  // 구슬 id(= order)는 매 라운드 재사용된다. 리셋 시 취소하지 않으면 이 타이머가
  // 뒤늦게 발화해 같은 id를 가진 새 라운드의 구슬을 지워버린다
  private _pendingRemovals: number[] = [];

  private _uiObjects: UIObject[] = [];

  private _autoRecording: boolean = false;
  private _recorder!: VideoRecorder;

  private physics!: IPhysics;

  private _isReady: boolean = false;
  protected fastForwarder!: FastForwader;
  protected _theme: ColorTheme = Themes.dark;

  get isReady() {
    return this._isReady;
  }

  protected createRenderer(): RouletteRenderer {
    return new RouletteRenderer();
  }

  protected createFastForwader(): FastForwader {
    return new FastForwader();
  }

  constructor() {
    super();
    this._renderer = this.createRenderer();
    this._renderer.init().then(() => {
      this._init().then(() => {
        this._isReady = true;
        this._update();
      });
    });
  }

  public getZoom() {
    return initialZoom * this._camera.zoom;
  }

  private addUiObject(obj: UIObject) {
    this._uiObjects.push(obj);
    if (obj.onWheel) {
      this._renderer.canvas.addEventListener('wheel', obj.onWheel);
    }
    if (obj.onMessage) {
      obj.onMessage((msg) => {
        console.log('onMessage', msg);
        this.dispatchEvent(new CustomEvent('message', { detail: msg }));
      });
    }
  }

  @bound
  private _update() {
    if (!this._lastTime) this._lastTime = Date.now();
    const currentTime = Date.now();

    this._elapsed += (currentTime - this._lastTime) * this._speed * this.fastForwarder.speed;
    if (this._elapsed > 100) {
      this._elapsed %= 100;
    }
    this._lastTime = currentTime;

    const interval = (this._updateInterval / 1000) * this._timeScale;

    while (this._elapsed >= this._updateInterval) {
      this.physics.step(interval);
      this._updateMarbles(this._updateInterval);
      this._particleManager.update(this._updateInterval);
      this._updateEffects(this._updateInterval);
      this._elapsed -= this._updateInterval;
      this._uiObjects.forEach((obj) => obj.update(this._updateInterval));
    }

    if (this._marbles.length > 1) {
      this._marbles.sort((a, b) => b.y - a.y);
    }

    if (this._stage) {
      this._camera.update({
        marbles: this._marbles,
        stage: this._stage,
        needToZoom: this._goalDist < zoomThreshold,
        targetIndex: this._winners.length > 0 ? this._targetIndex : 0,
      });
    }

    this._render();
    window.requestAnimationFrame(this._update);
  }

  private _updateMarbles(deltaTime: number) {
    if (!this._stage) return;

    for (let i = 0; i < this._marbles.length; i++) {
      const marble = this._marbles[i];
      marble.update(deltaTime);
      if (marble.skill !== Skills.None) {
        this._applySkill(marble);
      }
      if (marble.y > this._stage.goalY) {
        this._winners.push(marble);
        if (this._isRunning && this._isWinningRank(this._winners.length - 1)) {
          this._particleManager.shot(this._renderer.width, this._renderer.height);
        }
        this._pendingRemovals.push(
          window.setTimeout(() => {
            this.physics.removeMarble(marble.id);
          }, 500)
        );
      }
    }

    const targetIndex = this._targetIndex;
    const topY = this._marbles[targetIndex] ? this._marbles[targetIndex].y : 0;
    this._goalDist = Math.abs(this._stage.zoomY - topY);
    this._timeScale = this._calcTimeScale();

    this._marbles = this._marbles.filter((marble) => marble.y <= this._stage?.goalY);

    this._checkFinish();
  }

  /** 발동한 스킬을 물리에 적용하고 이펙트를 띄운다. 눈에 확실히 보이도록 효과는 세게 잡았다 */
  private _applySkill(marble: Marble) {
    const skill = marble.skill;
    const physics = this.physics;
    const effectAt = (x: number, y: number) => this._effects.push(new SkillEffect(x, y, skill));
    effectAt(marble.x, marble.y);
    switch (skill) {
      case Skills.Impact:
        physics.impact(marble.id);
        break;
      case Skills.Dash:
        this._startDash(marble);
        break;
      case Skills.Gun:
        this._startGun(marble);
        break;
      case Skills.Feather:
      case Skills.Anchor:
        marble.startEffect(skill);
        break;
      case Skills.Magnet:
        physics.attract(marble.id, 7);
        break;
      case Skills.Freeze:
        // 주변 구슬을 잠시 얼린다. 순간 정지가 아니라 한동안 움직이지 못한다
        this._marblesAround(marble.position, getSkillView(Skills.Freeze).effectRadius, marble).forEach((m) =>
          m.stun(900)
        );
        break;
      case Skills.Ghost: {
        // 아래로 곧게 빠져나가게 옆으로 가던 속도는 죽이고 아래로 밀어 준다
        const v = physics.getVelocity(marble.id);
        physics.setVelocity(marble.id, v.x * 0.2, Math.max(v.y, 4));
        physics.setGhost(marble.id, true);
        marble.startEffect(skill);
        break;
      }
      case Skills.Grow:
        physics.setRadius(marble.id, GROW_RADIUS);
        physics.setPassObstacles(marble.id, true);
        marble.size = GROW_RADIUS * 2;
        marble.startEffect(skill);
        break;
      case Skills.Bouncy:
        // 1을 넘기면 부딪힐 때마다 에너지가 늘어 범퍼 사이를 영원히 튕긴다
        physics.setRestitution(marble.id, 0.9);
        marble.startEffect(skill);
        break;
      case Skills.Swap: {
        const targetId = physics.swapWithMarbleAhead(marble.id, 12);
        if (targetId !== null) effectAt(marble.x, marble.y);
        break;
      }
      case Skills.Slap: {
        const targetId = physics.pushMarbleAhead(marble.id, 6, -14);
        const target = this._marbles.find((m) => m.id === targetId);
        if (target) effectAt(target.x, target.y);
        break;
      }
      case Skills.SlowField:
        this._throwSlowField(marble);
        break;
      case Skills.Hex: {
        // 나보다 앞서 있는(아래쪽) 구슬 중 하나를 골라 멈춘다. 없으면 아무나
        const others = this._marbles.filter((m) => m !== marble && m.canBeStunned);
        const ahead = others.filter((m) => m.y > marble.y);
        const pool = ahead.length > 0 ? ahead : others;
        const target = pool[Math.floor(Math.random() * pool.length)];
        if (target) {
          target.stun(2000);
          effectAt(target.x, target.y);
        }
        break;
      }
    }
  }

  private _alive(marble: Marble) {
    return this._marbles.includes(marble);
  }

  private _schedule(delay: number, run: () => void) {
    this._tasks.push({ delay, run });
  }

  private _updateTasks(deltaTime: number) {
    if (this._tasks.length === 0) return;
    const due: (() => void)[] = [];
    this._tasks = this._tasks.filter((task) => {
      task.delay -= deltaTime;
      if (task.delay > 0) return true;
      due.push(task.run);
      return false;
    });
    due.forEach((run) => run());
  }

  /**
   * 번개 돌진: 0.12초 간격으로 다섯 번 순간이동한다. 매번 아래쪽 반원(좌우 75도까지)에서
   * 벽·장애물에 막히지 않는 방향을 골라 그 끝까지 번쩍 이동하고, 지난번과 반대쪽으로 꺾으려 한다
   */
  private _startDash(marble: Marble) {
    const DASHES = 5;
    const LENGTH = 2.8;
    let lastSide = Math.random() < 0.5 ? -1 : 1;
    const dashOnce = () => {
      if (!this._alive(marble) || marble.isStunned) return;
      const from = marble.position;
      const candidates: { dx: number; dy: number; dist: number; side: number }[] = [];
      for (let deg = -75; deg <= 75; deg += 15) {
        const a = (deg * Math.PI) / 180;
        const dx = Math.sin(a);
        const dy = Math.cos(a);
        const frac = this.physics.clearFraction(
          from.x,
          from.y,
          from.x + dx * LENGTH,
          from.y + dy * LENGTH,
          MARBLE_RADIUS
        );
        const dist = frac * LENGTH - MARBLE_RADIUS - 0.05;
        if (dist > 0.8) candidates.push({ dx, dy, dist, side: Math.sign(deg) });
      }
      if (candidates.length === 0) return;
      const longest = Math.max(...candidates.map((c) => c.dist));
      const good = candidates.filter((c) => c.dist >= longest * 0.7);
      const zig = good.filter((c) => c.side === -lastSide);
      const pool = zig.length > 0 ? zig : good;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (pick.side !== 0) lastSide = pick.side;
      const to = { x: from.x + pick.dx * pick.dist, y: from.y + pick.dy * pick.dist };
      this.physics.teleport(marble.id, to.x, to.y);
      this.physics.setVelocity(marble.id, pick.dx * 5, pick.dy * 5);
      this._effects.push(new LightningTrail(from, to, '#ffe066'));
    };
    for (let i = 0; i < DASHES; i++) {
      this._schedule(i * 120, dashOnce);
    }
  }

  /** 총격: 가까운 구슬 다섯에게 0.09초 간격으로 총알을 쏜다. 맞으면 총알 방향으로 날아간다 */
  private _startGun(marble: Marble) {
    const RANGE = 9;
    const SHOTS = 5;
    const origin = marble.position;
    const targets = this._marblesAround(origin, RANGE, marble)
      .sort((p, q) => Math.hypot(p.x - origin.x, p.y - origin.y) - Math.hypot(q.x - origin.x, q.y - origin.y))
      .slice(0, SHOTS);
    targets.forEach((target, i) => {
      this._schedule(i * 90, () => {
        if (!this._alive(marble) || !this._alive(target)) return;
        const from = marble.position;
        this._effects.push(
          new Projectile(
            from,
            () => (this._alive(target) ? target.position : null),
            110,
            { color: '#ff4757', size: 0.09 },
            (at) => {
              const dx = at.x - from.x;
              const dy = at.y - from.y;
              const len = Math.hypot(dx, dy) || 1;
              this.physics.applyImpulse(target.id, (dx / len) * 9, (dy / len) * 9 - 2);
              this._effects.push(new SkillEffect(at.x, at.y, Skills.Gun, false));
            }
          )
        );
      });
    });
  }

  /** 둔화탄: 1등(나 말고 가장 앞선 구슬)에게 구체를 던져, 떨어진 자리 주변 구슬을 느리게 만든다 */
  private _throwSlowField(marble: Marble) {
    const leader = this._marbles
      .filter((m) => m !== marble)
      .reduce<Marble | null>((best, m) => {
        return !best || m.y > best.y ? m : best;
      }, null);
    if (!leader) return;
    const radius = getSkillView(Skills.SlowField).effectRadius;
    this._effects.push(
      new Projectile(
        marble.position,
        () => (this._alive(leader) ? leader.position : null),
        380,
        { color: '#81ecec', size: 0.22, arc: 1.5 },
        (at) => {
          this._marblesAround(at, radius, marble).forEach((m) => m.slow(2000));
          this._effects.push(new SkillEffect(at.x, at.y, Skills.SlowField, false));
        }
      )
    );
  }

  /** 반지름 안에 있는 구슬들. except는 빼고 */
  private _marblesAround(center: { x: number; y: number }, radius: number, except?: Marble): Marble[] {
    return this._marbles.filter((m) => m !== except && Math.hypot(m.x - center.x, m.y - center.y) < radius);
  }

  /**
   * 능력을 나눠 준다. 능력 모드는 현재 테마 세트를 골고루 돌리되 순서는 매번 섞고,
   * 모노전투는 스킬 하나를 뽑아 모든 구슬에 똑같이 준다
   */
  private _assignAbilities() {
    const poolSkills = getSkillPool().map((v) => v.skill);
    if (poolSkills.length === 0) return;
    if (options.skillMode === 'mono') {
      const chosen = poolSkills[Math.floor(Math.random() * poolSkills.length)];
      this._marbles.forEach((marble) => {
        marble.ability = chosen;
      });
      return;
    }
    let pool = shuffle(poolSkills);
    [...this._marbles]
      .sort((a, b) => a.id - b.id)
      .forEach((marble, i) => {
        if (i % pool.length === 0 && i > 0) pool = shuffle(poolSkills);
        marble.ability = pool[i % pool.length];
      });
  }

  /** 스킬 모드가 바뀌었을 때 능력을 다시 나눈다 */
  public refreshAbilities() {
    this._assignAbilities();
  }

  /** 능력 모드 목록 창에 보여줄 구슬별 능력. 생성 순서(id) 기준 */
  public getMarbleAbilities() {
    return [...this._marbles]
      .sort((a, b) => a.id - b.id)
      .map((marble) => {
        const view = getSkillView(marble.ability);
        return {
          name: marble.name,
          hue: marble.hue,
          ability: marble.ability,
          skillName: view.name,
          description: view.description,
          svg: skillBadgeSvg(view),
        };
      });
  }

  /** 현재 테마의 능력 목록(설명·배지 포함) */
  public getSkillList() {
    return getSkillPool().map((view) => ({ ...view, svg: skillBadgeSvg(view) }));
  }

  /** 카메라와 슬로우모션이 주목할 구슬 = 당첨 커트라인에 걸쳐있는 구슬 */
  private get _targetIndex() {
    return this._winnerRange.end - this._winners.length;
  }

  private _isWinningRank(rank: number) {
    return rank >= this._winnerRange.start && rank <= this._winnerRange.end;
  }

  private _checkFinish() {
    if (!this._isRunning) return;
    const { start, end } = this._winnerRange;

    // 남은 구슬이 1개면 그 등수는 골인하지 않아도 확정된다. 2개 이상 남았다면 그들 사이의
    // 순위는 물리로만 정해지므로 예측하지 않는다 (당첨 범위 안에서도 순위는 의미를 가진다)
    const early = this._winners.length > 0 && this._marbles.length === 1;
    const ranked = early ? [...this._winners, this._marbles[0]] : this._winners;
    if (ranked.length <= end) return;

    if (early && this._isWinningRank(this._winners.length)) {
      this._particleManager.shot(this._renderer.width, this._renderer.height);
    }

    this._result = ranked.slice(start, end + 1);
    this._isRunning = false;
    this.dispatchEvent(
      new CustomEvent('goal', {
        detail: { winner: this._result[0].name, winners: this._result.map((m) => m.name) },
      })
    );
    setTimeout(() => {
      this._recorder.stop();
    }, 1000);
  }

  private _calcTimeScale(): number {
    if (!this._stage) return 1;
    const targetIndex = this._targetIndex;
    if (this._winners.length < this._winnerRange.end + 1 && this._goalDist < zoomThreshold) {
      if (
        this._marbles[targetIndex].y > this._stage.zoomY - zoomThreshold * 1.2 &&
        (this._marbles[targetIndex - 1] || this._marbles[targetIndex + 1])
      ) {
        return Math.max(0.2, this._goalDist / zoomThreshold);
      }
    }
    return 1;
  }

  private _updateEffects(deltaTime: number) {
    this._updateTasks(deltaTime);
    this._effects.forEach((effect) => effect.update(deltaTime));
    this._effects = this._effects.filter((effect) => !effect.isDestroy);
  }

  private _render() {
    if (!this._stage) return;
    const renderParams = {
      camera: this._camera,
      stage: this._stage,
      entities: this.physics.getEntities(),
      marbles: this._marbles,
      winners: this._winners,
      particleManager: this._particleManager,
      effects: this._effects,
      winnerRange: this._winnerRange,
      result: this._result,
      size: { x: this._renderer.width, y: this._renderer.height },
      theme: this._theme,
    };
    this._renderer.render(renderParams, this._uiObjects);
  }

  private async _init() {
    this._recorder = new VideoRecorder(this._renderer.canvas);

    this.physics = new Box2dPhysics();
    await this.physics.init();

    this.addUiObject(new RankRenderer());
    this.attachEvent();
    const minimap = new Minimap();
    minimap.onViewportChange((pos) => {
      if (pos) {
        this._camera.setPosition(pos, false);
        this._camera.lock(true);
      } else {
        this._camera.lock(false);
      }
    });
    this.addUiObject(minimap);
    this.fastForwarder = this.createFastForwader();
    this.addUiObject(this.fastForwarder);
    this._stage = stages[0];
    this._loadMap();
  }

  @bound
  private mouseHandler(eventName: MouseEventName, e: MouseEvent) {
    const handlerName = `on${eventName}` as MouseEventHandlerName;

    const sizeFactor = this._renderer.sizeFactor;
    const pos = { x: e.offsetX * sizeFactor, y: e.offsetY * sizeFactor };
    this._uiObjects.forEach((obj) => {
      if (!obj[handlerName]) return;
      const bounds = obj.getBoundingBox();
      if (!bounds) {
        obj[handlerName]({ ...pos, button: e.button });
      } else if (
        bounds &&
        pos.x >= bounds.x &&
        pos.y >= bounds.y &&
        pos.x <= bounds.x + bounds.w &&
        pos.y <= bounds.y + bounds.h
      ) {
        obj[handlerName]({ x: pos.x - bounds.x, y: pos.y - bounds.y, button: e.button });
      } else {
        obj[handlerName](undefined);
      }
    });
  }

  private attachEvent() {
    const canvas = this._renderer.canvas;
    const onPointerRelease = (e: Event) => {
      this.mouseHandler('MouseUp', e as MouseEvent);
      window.removeEventListener('pointerup', onPointerRelease);
      window.removeEventListener('pointercancel', onPointerRelease);
    };

    canvas.addEventListener('pointerdown', (e: Event) => {
      this.mouseHandler('MouseDown', e as MouseEvent);
      window.addEventListener('pointerup', onPointerRelease);
      window.addEventListener('pointercancel', onPointerRelease);
    });

    ['MouseMove', 'DblClick'].forEach((ev) => {
      // @ts-expect-error
      canvas.addEventListener(ev.toLowerCase().replace('mouse', 'pointer'), this.mouseHandler.bind(this, ev));
    });
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    canvas.addEventListener('click', (e) => {
      if (this.resultCloseHitAt(e)) {
        this._renderer.closeResultPopup();
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      canvas.style.cursor = this.resultCloseHitAt(e) ? 'pointer' : '';
    });
  }

  private _loadMap() {
    if (!this._stage) {
      throw new Error('No map has been selected');
    }

    this.physics.createStage(this._stage);
    this._camera.initializePosition();
  }

  public clearMarbles() {
    this._pendingRemovals.forEach((id) => window.clearTimeout(id));
    this._pendingRemovals = [];
    this._tasks = [];
    this.physics.clearMarbles();
    this._result = null;
    this._winners = [];
    this._marbles = [];
  }

  public async startRecording() {
    if (!this._autoRecording) return;
    try {
      await this._recorder.start();
    } catch (e) {
      console.error('recording failed to start', e);
    }
  }

  public start() {
    this._isRunning = true;
    this._winnerRange = clipWinnerRange(options.winnerRange, this._marbles.length);
    this._camera.startFollowingMarbles();

    if (this._autoRecording) {
      this._recorder.start().then(() => {
        this.physics.start();
        this._marbles.forEach((marble) => (marble.isActive = true));
      });
    } else {
      this.physics.start();
      this._marbles.forEach((marble) => (marble.isActive = true));
    }
  }

  public setSpeed(value: number) {
    if (value <= 0) {
      throw new Error('Speed multiplier must larger than 0');
    }
    this._speed = value;
  }

  private resultCloseHitAt(e: MouseEvent): boolean {
    const sizeFactor = this._renderer.sizeFactor;
    return this._renderer.getResultCloseHitAt(e.offsetX * sizeFactor, e.offsetY * sizeFactor);
  }

  public setTheme(themeName: keyof typeof Themes) {
    if (!Themes[themeName]) return;
    this._theme = Themes[themeName];
    options.themeName = themeName;
    // 테마마다 스킬 세트가 달라서 능력을 다시 나눈다
    this._assignAbilities();
  }

  public getSpeed() {
    return this._speed;
  }

  public setWinningRank(rank: number) {
    this.setWinnerRange(rank, rank);
  }

  public setWinnerRange(start: number, end: number) {
    options.winnerRange = { start, end };
    this._winnerRange = clipWinnerRange(options.winnerRange, this._marbles.length);
  }

  /** 실제 구슬 수에 맞춰 잘린 범위 (0-based, 양끝 포함) */
  public getWinnerRange(): WinnerRange {
    return { ...this._winnerRange };
  }

  public setAutoRecording(value: boolean) {
    this._autoRecording = value;
  }

  public setMarbles(names: string[]) {
    this.reset();
    const arr = names.slice();

    let maxWeight = -Infinity;
    let minWeight = Infinity;

    const members = arr
      .map((nameString) => {
        const result = parseName(nameString);
        if (!result) return null;
        const { name, weight, count } = result;
        if (weight > maxWeight) maxWeight = weight;
        if (weight < minWeight) minWeight = weight;
        return { name, weight, count };
      })
      .filter((member) => !!member);

    const gap = maxWeight - minWeight;

    let totalCount = 0;
    members.forEach((member) => {
      if (member) {
        member.weight = 0.1 + (gap ? (member.weight - minWeight) / gap : 0);
        totalCount += member.count;
      }
    });

    const orders = shuffle(
      Array(totalCount)
        .fill(0)
        .map((_, i) => i)
    );
    members.forEach((member) => {
      if (member) {
        for (let j = 0; j < member.count; j++) {
          const order = orders.pop() || 0;
          this._marbles.push(new Marble(this.physics, order, totalCount, member.name, member.weight));
        }
      }
    });

    // 능력은 항상 나눠 둔다. 나중에 능력 모드로 바꿔도 바로 쓸 수 있고, 섞기를 누르면 새로 배정된다
    this._assignAbilities();

    // 카메라를 구슬 생성 위치 중앙으로 이동 + 줌인
    if (totalCount > 0) {
      const cols = Math.min(totalCount, 10);
      const rows = Math.ceil(totalCount / 10);
      const lineDelta = -Math.max(0, Math.ceil(rows - 5));
      const centerX = 10.25 + (cols - 1) * 0.3;
      const centerY = (1 + rows) / 2 + lineDelta;

      const spawnWidth = Math.max((cols - 1) * 0.6, 1);
      const spawnHeight = Math.max(rows - 1, 1);
      const margin = 3;
      const viewW = canvasWidth / initialZoom;
      const viewH = canvasHeight / initialZoom;
      const zoom = Math.max(
        1.5,
        Math.min(Math.min(viewW / (spawnWidth + margin * 2), viewH / (spawnHeight + margin * 2)), 3)
      );

      this._camera.initializePosition({ x: centerX, y: centerY }, zoom);
    }
  }

  private _clearMap() {
    this.physics.clear();
    this._marbles = [];
  }

  public reset() {
    this.clearMarbles();
    this._clearMap();
    this._loadMap();
    this._goalDist = Infinity;
  }

  public getCount() {
    return this._marbles.length;
  }

  public getMaps() {
    return stages.map((stage, index) => {
      return {
        index,
        title: stage.title,
      };
    });
  }

  public getCurrentMap() {
    if (!this._stage) return null;
    return {
      index: stages.indexOf(this._stage),
      title: this._stage.title,
    };
  }

  public setMap(index: number) {
    if (index < 0 || index > stages.length - 1) {
      throw new Error('Incorrect map number');
    }
    const names = this._marbles.map((marble) => marble.name);
    this._stage = stages[index];
    this.setMarbles(names);
    this._camera.initializePosition();
  }
}
