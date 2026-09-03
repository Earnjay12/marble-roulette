import { MARBLE_RADIUS, RPG_TRIGGER_RATE, Skills, STUCK_DELAY, Themes } from './data/constants';
import { drawSkillBadge, getSkillView } from './data/skills';
import type { IPhysics } from './IPhysics';
import options from './options';
import type { ColorTheme } from './types/ColorTheme';
import type { VectorLike } from './types/VectorLike';
import { transformGuard } from './utils/transformGuard';
import { rad } from './utils/utils';
import { Vector } from './utils/Vector';

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
  /** 능력 모드에서 이 구슬이 가진 고유 스킬 */
  ability: Skills = Skills.None;
  isActive: boolean = false;

  /** 지속 효과(깃털·거대화 등)가 켜져 있으면 그 스킬, 남은 시간 */
  private _effectSkill: Skills = Skills.None;
  private _effectRemaining = 0;
  /** 저주에 걸려 멈춰 있는 남은 시간 */
  private _stunRemaining = 0;

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

      if (this._stuckTime > STUCK_DELAY) {
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
    this._updateStun(deltaTime);
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

  /** 지속 효과를 시작한다. 실제 물리 변경은 roulette이 하고, 여기서는 만료만 관리한다 */
  startEffect(skill: Skills) {
    this._effectSkill = skill;
    this._effectRemaining = getSkillView(skill).duration ?? 0;
  }

  /** 저주: 일정 시간 그 자리에 멈춘다. 중력도 끈다 */
  stun(duration: number) {
    this._stunRemaining = duration;
    this.physics.freezeMarble(this.id);
    this.physics.setGravityScale(this.id, 0);
  }

  private _gravityForEffect(): number {
    switch (this._effectSkill) {
      case Skills.Feather:
        return 0.2;
      case Skills.Anchor:
        return 3;
      case Skills.AntiGravity:
        return -0.8;
      default:
        return 1;
    }
  }

  private _updateStun(deltaTime: number) {
    if (this._stunRemaining <= 0) return;
    this._stunRemaining -= deltaTime;
    // 다른 구슬이 밀어도 제자리를 지키게 매 프레임 속도를 죽인다
    this.physics.freezeMarble(this.id);
    if (this._stunRemaining <= 0) {
      this.physics.setGravityScale(this.id, this._gravityForEffect());
    }
  }

  private _updateEffect(deltaTime: number) {
    if (this._effectSkill === Skills.None) return;
    this._effectRemaining -= deltaTime;
    if (this._effectRemaining > 0) return;

    const skill = this._effectSkill;
    this._effectSkill = Skills.None;
    switch (skill) {
      case Skills.Feather:
      case Skills.Anchor:
      case Skills.AntiGravity:
        if (this._stunRemaining <= 0) this.physics.setGravityScale(this.id, 1);
        break;
      case Skills.Ghost:
        this.physics.setGhost(this.id, false);
        break;
      case Skills.Grow:
      case Skills.Shrink:
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

  private _updateSkillInformation(deltaTime: number) {
    if (this._coolTime > 0) {
      this._coolTime -= deltaTime;
    }

    if (this._coolTime <= 0) {
      if (options.skillMode === 'rpg') {
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
      ctx.globalAlpha = 0.45;
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
    if (options.skillMode === 'rpg') {
      this._drawAbilityBadge(ctx, zoom);
    }
    if (this._stunRemaining > 0) {
      this._drawStunMark(ctx, zoom);
    }
  }

  /** 테마마다 다른 구슬 모습. 단색·강철·보석·네온·연필 낙서 */
  private _drawStyledBody(ctx: CanvasRenderingContext2D, hs: number, lightness: number) {
    const { x, y } = this.position;
    const hue = this.hue;
    const circle = (r: number) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
    };

    switch (this.theme.marbleStyle) {
      case 'steel': {
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
        break;
      }
      case 'gem': {
        // 보석: 밝은 중심, 육각 면, 반짝임
        const g = ctx.createRadialGradient(x - hs * 0.2, y - hs * 0.2, hs * 0.05, x, y, hs);
        g.addColorStop(0, `hsl(${hue} 100% 93%)`);
        g.addColorStop(0.55, `hsl(${hue} 100% ${lightness}%)`);
        g.addColorStop(1, `hsl(${hue} 100% ${Math.max(20, lightness - 38)}%)`);
        circle(hs);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.lineWidth = hs * 0.1;
        ctx.strokeStyle = `hsl(${hue} 100% 28%)`;
        ctx.stroke();
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i + Math.PI / 6;
          const px = x + Math.cos(a) * hs * 0.62;
          const py = y + Math.sin(a) * hs * 0.62;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.lineWidth = hs * 0.06;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.stroke();
        this._drawSparkle(ctx, x - hs * 0.42, y - hs * 0.42, hs * 0.22);
        break;
      }
      case 'neon': {
        // 네온: 어두운 심에 빛나는 링
        circle(hs);
        ctx.fillStyle = `hsl(${hue} 60% 12%)`;
        ctx.fill();
        const ring = `hsl(${hue} 100% ${lightness}%)`;
        ctx.shadowColor = ring;
        ctx.shadowBlur = 10;
        ctx.lineWidth = hs * 0.22;
        ctx.strokeStyle = ring;
        circle(hs * 0.88);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.lineWidth = hs * 0.08;
        ctx.globalAlpha *= 0.8;
        circle(hs * 0.45);
        ctx.stroke();
        ctx.globalAlpha /= 0.8;
        break;
      }
      case 'sketch': {
        // 연필 낙서: 종이색 바탕에 두 번 그은 테두리와 빗금
        const line = `hsl(${hue} 70% 40%)`;
        circle(hs);
        ctx.fillStyle = '#fffdf5';
        ctx.fill();
        ctx.save();
        ctx.clip();
        ctx.strokeStyle = line;
        ctx.lineWidth = hs * 0.06;
        ctx.globalAlpha *= 0.45;
        ctx.beginPath();
        for (let i = -2; i <= 2; i++) {
          ctx.moveTo(x - hs + i * hs * 0.45, y + hs);
          ctx.lineTo(x + i * hs * 0.45 + hs * 0.2, y - hs);
        }
        ctx.stroke();
        ctx.restore();
        const jitter = ((this.id * 7) % 5) * 0.012 - 0.024;
        ctx.strokeStyle = line;
        ctx.lineWidth = hs * 0.14;
        circle(hs);
        ctx.stroke();
        ctx.globalAlpha *= 0.5;
        ctx.beginPath();
        ctx.arc(x + jitter, y - jitter, hs * 0.96, 0.3, Math.PI * 2 + 0.3);
        ctx.stroke();
        ctx.globalAlpha /= 0.5;
        break;
      }
      default:
        circle(hs);
        ctx.fillStyle = `hsl(${hue} 100% ${lightness}%)`;
        ctx.fill();
    }
  }

  private _drawSparkle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.quadraticCurveTo(cx, cy, cx + r, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy + r);
    ctx.quadraticCurveTo(cx, cy, cx - r, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy - r);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();
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

  /** 능력 모드에서 구슬 머리 위에 붙는 스킬 배지 */
  private _drawAbilityBadge(ctx: CanvasRenderingContext2D, zoom: number) {
    if (this.ability === Skills.None) return;
    ctx.save();
    ctx.translate(this.x, this.y - this.size / 2);
    ctx.scale(1 / zoom, 1 / zoom);
    drawSkillBadge(ctx, this.ability, 0, -11, 17);
    ctx.restore();
  }

  /** 저주에 걸려 멈춘 동안 두르는 점선 고리 */
  private _drawStunMark(ctx: CanvasRenderingContext2D, zoom: number) {
    ctx.save();
    ctx.strokeStyle = '#6c5ce7';
    ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([0.1, 0.07]);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size / 2 + 4 / zoom, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
