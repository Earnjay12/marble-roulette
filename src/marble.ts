import { RPG_TRIGGER_RATE, SkillInfos, Skills, STUCK_DELAY, Themes } from './data/constants';
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
  size: number = 0.5;
  color: string = 'red';
  hue: number = 0;
  impact: number = 0;
  weight: number = 1;
  /** 이번 프레임에 발동한 스킬. 매 프레임 None으로 되돌아간다 */
  skill: Skills = Skills.None;
  /** 능력 모드에서 이 구슬이 가진 고유 스킬 */
  ability: Skills = Skills.None;
  isActive: boolean = false;

  /** 지속 효과(깃털·무게추·유령)가 켜져 있으면 그 스킬, 남은 시간 */
  private _effectSkill: Skills = Skills.None;
  private _effectRemaining = 0;

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
    if (!this.isActive) return;
    if (options.useSkills) {
      this._updateSkillInformation(deltaTime);
    }
  }

  get activeEffect(): Skills {
    return this._effectSkill;
  }

  /** 지속 효과를 시작한다. 실제 물리 변경은 roulette이 하고, 여기서는 만료만 관리한다 */
  startEffect(skill: Skills) {
    this._effectSkill = skill;
    this._effectRemaining = SkillInfos[skill].duration ?? 0;
  }

  private _updateEffect(deltaTime: number) {
    if (this._effectSkill === Skills.None) return;
    this._effectRemaining -= deltaTime;
    if (this._effectRemaining > 0) return;

    switch (this._effectSkill) {
      case Skills.Feather:
      case Skills.Anchor:
        this.physics.setGravityScale(this.id, 1);
        break;
      case Skills.Ghost:
        this.physics.setGhost(this.id, false);
        break;
    }
    this._effectSkill = Skills.None;
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
    this._drawMarbleBody(ctx, true);
  }

  private _drawMarbleBody(ctx: CanvasRenderingContext2D, isMinimap: boolean) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, isMinimap ? this.size : this.size / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private _renderNormal(ctx: CanvasRenderingContext2D, zoom: number, outline: boolean, skin?: CanvasImageSource) {
    const hs = this.size / 2;

    ctx.fillStyle = `hsl(${this.hue} 100% ${this.theme.marbleLightness + 25 * Math.min(1, this.impact / 500)}%`;

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
      this._drawMarbleBody(ctx, false);
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
      this._drawAbilityIcon(ctx, zoom);
    }
  }

  /** 능력 모드에서 구슬 머리 위에 붙는 스킬 아이콘 */
  private _drawAbilityIcon(ctx: CanvasRenderingContext2D, zoom: number) {
    const icon = SkillInfos[this.ability].icon;
    if (!icon) return;
    transformGuard(ctx, () => {
      ctx.translate(this.x, this.y - this.size / 2 - 0.12);
      ctx.scale(1 / zoom, 1 / zoom);
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(icon, 0, 0);
    });
  }

  private _drawName(ctx: CanvasRenderingContext2D, zoom: number) {
    transformGuard(ctx, () => {
      ctx.font = `12pt sans-serif`;
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 0;
      ctx.translate(this.x, this.y + 0.25);
      ctx.scale(1 / zoom, 1 / zoom);
      ctx.strokeText(this.name, 0, 0);
      ctx.fillText(this.name, 0, 0);
    });
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
}
