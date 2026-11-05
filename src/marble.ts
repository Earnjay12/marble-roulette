import { MARBLE_RADIUS, RPG_TRIGGER_RATE, Skills, STUCK_DELAY, Themes } from './data/constants';
import { drawSkillGlyph, getSkillView } from './data/skills';
import type { IPhysics } from './IPhysics';
import options from './options';
import type { ColorTheme } from './types/ColorTheme';
import type { VectorLike } from './types/VectorLike';
import { transformGuard } from './utils/transformGuard';
import { rad } from './utils/utils';
import { Vector } from './utils/Vector';

/** 둔화 상태의 중력 배율 */
const SLOW_GRAVITY = 0.25;
/** 거대화 반지름. 원본 맵의 가장 좁은 출구(0.9칸)를 지날 수 있는 크기 */
export const GROW_RADIUS = MARBLE_RADIUS * 1.6;
/** 유령이 끝날 때 벽 속에 박혀 있으면 이만큼까지 더 연장한다 */
const GHOST_MAX_EXTEND = 1500;

export class Marble {
  type = 'marble' as const;
  name: string = '';
  size: number = MARBLE_RADIUS * 2;
  color: string = 'red';
  hue: number = 0;
  impact: number = 0;
  weight: number = 1;
  /** 이번 프레임에 발동한 스킬. 매 프레임 None으로 되돌아간다 */
  skill: Skills = Skills.None;
  /** 능력·모노전투 모드에서 이 구슬이 가진 스킬 */
  ability: Skills = Skills.None;
  isActive: boolean = false;

  /** 지속 효과(깃털·거대화 등)가 켜져 있으면 그 스킬, 남은 시간 */
  private _effectSkill: Skills = Skills.None;
  private _effectRemaining = 0;
  /** 얼음·저주로 멈춰 있는 남은 시간 */
  private _stunRemaining = 0;
  /** 둔화탄에 맞아 느려진 남은 시간 */
  private _slowRemaining = 0;
  /**
   * 멈춤·둔화가 풀린 직후의 면역 시간. 없으면 모노전투에서 서로 계속 얼려
   * 출구 앞에서 영원히 멈춰 버린다
   */
  private _stunImmune = 0;
  private _slowImmune = 0;
  /** 유령 상태에서 마지막으로 코스 안쪽에 있던 자리. 끝났을 때 밖이면 여기로 되돌린다 */
  private _ghostSafe: VectorLike | null = null;
  private _ghostExtended = 0;

  private _skillRate = 0.0005;
  private _coolTime = 5000;
  private _maxCoolTime = 5000;
  private _stuckTime = 0;
  private lastPosition: VectorLike = { x: 0, y: 0 };
  private theme: ColorTheme = Themes.dark;

  private physics: IPhysics;

  id: number;

  get position() {
    return this.physics.getMarblePosition(this.id) || { x: 0, y: 0, angle: 0 };
  }

  get x() {
    return this.position.x;
  }

  set x(v: number) {
    this.position.x = v;
  }

  get y() {
    return this.position.y;
  }

  set y(v: number) {
    this.position.y = v;
  }

  get angle() {
    return this.position.angle;
  }

  constructor(physics: IPhysics, order: number, max: number, name?: string, weight: number = 1) {
    this.name = name || `M${order}`;
    this.weight = weight;
    this.physics = physics;

    this._maxCoolTime = 1000 + (1 - this.weight) * 4000;
    this._coolTime = this._maxCoolTime * Math.random();
    this._skillRate = 0.2 * this.weight;

    const maxLine = Math.ceil(max / 10);
    const line = Math.floor(order / 10);
    const lineDelta = -Math.max(0, Math.ceil(maxLine - 5));
    this.hue = (360 / max) * order;
    this.color = `hsl(${this.hue} 100% 70%)`;
    this.id = order;

    physics.createMarble(order, 10.25 + (order % 10) * 0.6, maxLine - line + lineDelta);
  }

  update(deltaTime: number) {
    if (this.isActive && Vector.lenSq(Vector.sub(this.lastPosition, this.position)) < 0.00001) {
      this._stuckTime += deltaTime;

      // 멈춘 상태는 일부러 세운 것이니 흔들지 않는다
      if (this._stuckTime > STUCK_DELAY && this._stunRemaining <= 0) {
        this.physics.shakeMarble(this.id);
        this._stuckTime = 0;
      }
    } else {
      this._stuckTime = 0;
    }
    this.lastPosition = { x: this.position.x, y: this.position.y };

    this.skill = Skills.None;
    if (this.impact) {
      this.impact = Math.max(0, this.impact - deltaTime);
    }
    this._updateEffect(deltaTime);
    this._updateStatus(deltaTime);
    if (!this.isActive) return;
    if (options.useSkills && this._stunRemaining <= 0) {
      this._updateSkillInformation(deltaTime);
    }
  }

  get activeEffect(): Skills {
    return this._effectSkill;
  }

  get isStunned(): boolean {
    return this._stunRemaining > 0;
  }

  get isSlowed(): boolean {
    return this._slowRemaining > 0;
  }

  /** 지금 멈춤을 걸 수 있는지(멈춰 있지도, 면역 중도 아님) */
  get canBeStunned(): boolean {
    return this._stunRemaining <= 0 && this._stunImmune <= 0;
  }

  /** 지속 효과를 시작한다. 중력 계열은 여기서 바로 적용하고, 나머지 물리 변경은 roulette이 한다 */
  startEffect(skill: Skills) {
    this._effectSkill = skill;
    this._effectRemaining = getSkillView(skill).duration ?? 0;
    if (skill === Skills.Ghost) {
      const { x, y } = this.position;
      this._ghostSafe = { x, y };
      this._ghostExtended = 0;
    }
    this._applyGravity();
  }

  /** 얼음·저주: 일정 시간 그 자리에 멈춘다. 중력도 끈다 */
  stun(duration: number) {
    if (!this.canBeStunned) return;
    this._stunRemaining = duration;
    this.physics.freezeMarble(this.id);
    this._applyGravity();
  }

  /** 둔화탄: 속도를 확 줄이고 한동안 아주 천천히 떨어진다 */
  slow(duration: number) {
    if (this._slowRemaining > 0 || this._slowImmune > 0) return;
    this._slowRemaining = duration;
    this.physics.scaleVelocity(this.id, 0.2);
    this._applyGravity();
  }

  /** 상태(멈춤·둔화)와 지속 효과를 합쳐 지금 맞는 중력 배율을 물리에 적용한다 */
  private _applyGravity() {
    let scale = 1;
    if (this._stunRemaining > 0) scale = 0;
    else if (this._slowRemaining > 0) scale = SLOW_GRAVITY;
    else if (this._effectSkill === Skills.Feather) scale = 0.25;
    else if (this._effectSkill === Skills.Anchor) scale = 5;
    this.physics.setGravityScale(this.id, scale);
  }

  private _updateStatus(deltaTime: number) {
    let changed = false;
    this._stunImmune = Math.max(0, this._stunImmune - deltaTime);
    this._slowImmune = Math.max(0, this._slowImmune - deltaTime);
    if (this._stunRemaining > 0) {
      this._stunRemaining -= deltaTime;
      // 다른 구슬이 밀어도 제자리를 지키게 매 프레임 속도를 죽인다
      this.physics.freezeMarble(this.id);
      if (this._stunRemaining <= 0) {
        changed = true;
        this._stunImmune = 2000;
      }
    }
    if (this._slowRemaining > 0) {
      this._slowRemaining -= deltaTime;
      if (this._slowRemaining <= 0) {
        changed = true;
        this._slowImmune = 2500;
      }
    }
    if (changed) this._applyGravity();
  }

  private _updateEffect(deltaTime: number) {
    if (this._effectSkill === Skills.None) return;

    if (this._effectSkill === Skills.Feather) {
      this.physics.avoidMarbles(this.id, 1.8, deltaTime / 1000);
    }
    if (this._effectSkill === Skills.Ghost) {
      const { x, y } = this.position;
      if (this.physics.isInsideCourse(x, y) && !this.physics.overlapsEntity(x, y, MARBLE_RADIUS)) {
        this._ghostSafe = { x, y };
      }
    }

    this._effectRemaining -= deltaTime;
    if (this._effectRemaining > 0) return;

    if (this._effectSkill === Skills.Ghost && !this._finishGhost(deltaTime)) return;

    const skill = this._effectSkill;
    this._effectSkill = Skills.None;
    switch (skill) {
      case Skills.Feather:
      case Skills.Anchor:
        this._applyGravity();
        break;
      case Skills.Ghost:
        this.physics.setGhost(this.id, false);
        break;
      case Skills.Grow:
        this.physics.setPassObstacles(this.id, false);
        this.physics.setRadius(this.id, MARBLE_RADIUS);
        this.size = MARBLE_RADIUS * 2;
        break;
      case Skills.Bouncy:
        this.physics.setRestitution(this.id, 0);
        break;
      case Skills.Titan:
        this.physics.setMassScale(this.id, 1);
        break;
    }
  }

  /**
   * 유령을 끝내도 되는지. 벽 속에 박혀 있으면 조금 더 통과 상태로 둔다.
   * 다 끝났는데 코스 바깥이면 마지막으로 안쪽에 있던 자리로 되돌린다
   */
  private _finishGhost(deltaTime: number): boolean {
    const { x, y } = this.position;
    if (this.physics.overlapsEntity(x, y, MARBLE_RADIUS) && this._ghostExtended < GHOST_MAX_EXTEND) {
      this._ghostExtended += deltaTime;
      return false;
    }
    if (!this.physics.isInsideCourse(x, y) && this._ghostSafe) {
      this.physics.teleport(this.id, this._ghostSafe.x, this._ghostSafe.y);
      this.physics.setVelocity(this.id, 0, 0);
    }
    this._ghostSafe = null;
    return true;
  }

  private _updateSkillInformation(deltaTime: number) {
    if (this._coolTime > 0) {
      this._coolTime -= deltaTime;
    }

    if (this._coolTime <= 0) {
      if (options.abilityMode) {
        // 지속 효과가 도는 동안은 다시 걸지 않는다
        const canFire = this.ability !== Skills.None && this._effectSkill === Skills.None;
        this.skill = canFire && Math.random() < RPG_TRIGGER_RATE ? this.ability : Skills.None;
      } else {
        this.skill = Math.random() < this._skillRate ? Skills.Impact : Skills.None;
      }
      this._coolTime = this._maxCoolTime;
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    zoom: number,
    outline: boolean,
    isMinimap: boolean = false,
    skin: CanvasImageSource | undefined,
    viewPort: { x: number; y: number; w: number; h: number; zoom: number },
    theme: ColorTheme
  ) {
    this.theme = theme;
    const viewPortHw = viewPort.w / viewPort.zoom / 2;
    const viewPortHh = viewPort.h / viewPort.zoom / 2;
    const viewPortLeft = viewPort.x - viewPortHw;
    const viewPortRight = viewPort.x + viewPortHw;
    const viewPortTop = viewPort.y - viewPortHh - this.size / 2;
    const viewPortBottom = viewPort.y + viewPortHh;
    if (
      !isMinimap &&
      (this.x < viewPortLeft || this.x > viewPortRight || this.y < viewPortTop || this.y > viewPortBottom)
    ) {
      return;
    }
    const transform = ctx.getTransform();
    if (isMinimap) {
      this._renderMinimap(ctx);
    } else {
      this._renderNormal(ctx, zoom, outline, skin);
    }
    ctx.setTransform(transform);
  }

  private _renderMinimap(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }

  private _renderNormal(ctx: CanvasRenderingContext2D, zoom: number, outline: boolean, skin?: CanvasImageSource) {
    const hs = this.size / 2;
    const lightness = this.theme.marbleLightness + 25 * Math.min(1, this.impact / 500);

    // 유령 상태는 반투명하게 그려서 통과 중임을 보여준다
    if (this._effectSkill === Skills.Ghost) {
      ctx.globalAlpha = 0.4;
    }
    if (this._effectSkill === Skills.Feather) {
      this._drawFeatherAura(ctx, hs);
    }
    if (skin) {
      transformGuard(ctx, () => {
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.drawImage(skin, -hs, -hs, hs * 2, hs * 2);
      });
    } else {
      this._drawStyledBody(ctx, hs, lightness);
    }
    if (options.abilityMode) {
      this._drawAbilityGlyph(ctx, hs);
    }

    ctx.globalAlpha = 1;
    ctx.shadowColor = '';
    ctx.shadowBlur = 0;
    this._drawName(ctx, zoom);

    if (outline) {
      this._drawOutline(ctx, 2 / zoom);
    }

    if (options.useSkills) {
      this._renderCoolTime(ctx, zoom);
    }
    if (this._stunRemaining > 0) {
      this._drawStatusRing(ctx, zoom, '#74b9ff', [0.1, 0.07]);
    } else if (this._slowRemaining > 0) {
      this._drawStatusRing(ctx, zoom, '#81ecec', [0.04, 0.1]);
    }
  }

  /** 깃털 상태: 구슬 둘레의 은은한 빛 */
  private _drawFeatherAura(ctx: CanvasRenderingContext2D, hs: number) {
    const { x, y } = this.position;
    const g = ctx.createRadialGradient(x, y, hs, x, y, hs * 2.6);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, hs * 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  /** 테마마다 다른 구슬 모습. 단색·강철 */
  private _drawStyledBody(ctx: CanvasRenderingContext2D, hs: number, lightness: number) {
    const { x, y } = this.position;
    const hue = this.hue;
    const circle = (r: number) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
    };

    if (this.theme.marbleStyle === 'steel') {
      // 강철구슬: 왼쪽 위 하이라이트에서 어두운 테두리로 떨어지는 구면 음영
      const g = ctx.createRadialGradient(x - hs * 0.35, y - hs * 0.35, hs * 0.05, x, y, hs);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.35, `hsl(${hue} 55% ${lightness}%)`);
      g.addColorStop(1, `hsl(${hue} 50% ${Math.max(18, lightness - 42)}%)`);
      circle(hs);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = hs * 0.12;
      ctx.strokeStyle = `hsl(${hue} 40% 22%)`;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.ellipse(x - hs * 0.4, y - hs * 0.45, hs * 0.2, hs * 0.12, -0.6, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    circle(hs);
    ctx.fillStyle = `hsl(${hue} 100% ${lightness}%)`;
    ctx.fill();
  }

  /** 능력 모드에서 구슬 안에 크게 들어가는 스킬 그림 */
  private _drawAbilityGlyph(ctx: CanvasRenderingContext2D, hs: number) {
    if (this.ability === Skills.None) return;
    const { x, y } = this.position;
    ctx.save();
    ctx.shadowBlur = 0;
    // 뒤에 흐린 원을 깔아 어떤 색 위에서도 읽히게 한다
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.arc(x, y, hs * 0.72, 0, Math.PI * 2);
    ctx.fill();
    drawSkillGlyph(ctx, this.ability, x, y, hs * 1.15, 'rgba(25, 25, 25, 0.88)');
    ctx.restore();
  }

  private _drawName(ctx: CanvasRenderingContext2D, zoom: number) {
    // 정렬·기준선을 여기서 직접 잡는다. 다른 그리기 코드가 바꿔 놓은 값이 새면 이름이 엉뚱한 곳에 찍힌다
    ctx.save();
    ctx.font = `bold 12pt ${this.theme.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 0;
    ctx.translate(this.x, this.y + this.size / 2 + 0.04);
    ctx.scale(1 / zoom, 1 / zoom);
    ctx.strokeText(this.name, 0, 0);
    ctx.fillText(this.name, 0, 0);
    ctx.restore();
  }

  private _drawOutline(ctx: CanvasRenderingContext2D, lineWidth: number) {
    ctx.beginPath();
    ctx.strokeStyle = this.theme.marbleWinningBorder;
    ctx.lineWidth = lineWidth;
    ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  private _renderCoolTime(ctx: CanvasRenderingContext2D, zoom: number) {
    ctx.strokeStyle = this.theme.coolTimeIndicator;
    ctx.lineWidth = 1 / zoom;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size / 2 + 2 / zoom, rad(270), rad(270 + (360 * this._coolTime) / this._maxCoolTime));
    ctx.stroke();
  }

  /** 멈춤·둔화 상태를 알리는 점선 고리 */
  private _drawStatusRing(ctx: CanvasRenderingContext2D, zoom: number, color: string, dash: number[]) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5 / zoom;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size / 2 + 5 / zoom, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
