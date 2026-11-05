import type { Skills } from './data/constants';
import { drawSkillBadge, getSkillView, type SkillView } from './data/skills';
import type { GameObject } from './gameObject';
import type { ColorTheme } from './types/ColorTheme';
import type { VectorLike } from './types/VectorLike';

const LIFETIME = 750;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** 스킬이 발동한 자리에서 퍼지는 링·입자·배지 애니메이션. 스킬 종류마다 모양이 다르다 */
export class SkillEffect implements GameObject {
  position: VectorLike;
  isDestroy: boolean = false;
  private _elapsed = 0;
  private _view: SkillView;
  private _particles: Particle[];
  private _showBadge: boolean;

  /** showBadge가 false면 링·입자만 그린다(둔화탄 착탄 지점처럼 배지가 겹치면 지저분한 곳) */
  constructor(x: number, y: number, skill: Skills, showBadge = true) {
    this.position = { x, y };
    this._view = getSkillView(skill);
    this._showBadge = showBadge;
    this._particles = this._spawnParticles();
  }

  private _spawnParticles(): Particle[] {
    const R = this._view.effectRadius;
    const out: Particle[] = [];
    const radial = (n: number, speed: number, size: number, startRadius = 0) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand(-0.25, 0.25);
        const s = speed * rand(0.6, 1.2);
        out.push({
          x: Math.cos(a) * startRadius,
          y: Math.sin(a) * startRadius,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          size,
          life: rand(0.6, 1),
        });
      }
    };

    switch (this._view.effect) {
      case 'burst':
        radial(18, R * 1.5, 0.16);
        break;
      case 'dash':
        radial(10, 5, 0.08);
        break;
      case 'gun':
        radial(8, 4, 0.07);
        break;
      case 'slap':
        for (let i = 0; i < 8; i++) {
          out.push({ x: rand(-0.7, 0.7), y: 0, vx: rand(-0.4, 0.4), vy: rand(-9, -4), size: 0.12, life: rand(0.6, 1) });
        }
        break;
      case 'float':
        for (let i = 0; i < 8; i++) {
          out.push({
            x: rand(-0.8, 0.8),
            y: rand(-0.2, 0.4),
            vx: rand(-0.5, 0.5),
            vy: rand(-1.6, -0.6),
            size: 0.18,
            life: rand(0.7, 1),
          });
        }
        break;
      case 'drop':
        for (let i = 0; i < 12; i++) {
          const dir = i % 2 === 0 ? 1 : -1;
          out.push({
            x: dir * 0.2,
            y: 0.3,
            vx: dir * rand(1.5, 4.5),
            vy: rand(-1.5, 0),
            size: 0.12,
            life: rand(0.6, 1),
          });
        }
        break;
      case 'pull':
        radial(16, -R * 1.4, 0.13, R);
        break;
      case 'frost':
        radial(12, R * 0.5, 0.1);
        break;
      case 'fade':
        for (let i = 0; i < 4; i++) {
          out.push({ x: 0, y: 0, vx: rand(-0.6, 0.6), vy: rand(-1.6, -0.5), size: 0.38, life: 1 });
        }
        break;
      case 'grow':
        radial(12, R * 1.1, 0.12);
        break;
      case 'bounce':
        for (let i = 0; i < 8; i++) {
          out.push({ x: rand(-0.4, 0.4), y: 0.3, vx: rand(-2, 2), vy: rand(-5, -2), size: 0.1, life: rand(0.6, 1) });
        }
        break;
      case 'swap':
        for (let i = 0; i < 10; i++) {
          const dir = i % 2 === 0 ? 1 : -1;
          out.push({ x: rand(-0.3, 0.3), y: 0, vx: 0, vy: dir * rand(3, 6), size: 0.1, life: rand(0.6, 1) });
        }
        break;
      case 'slow':
        radial(14, R * 0.45, 0.09);
        break;
      case 'hex':
        radial(12, 3, 0.12);
        break;
      case 'teleport':
        radial(12, -2.5, 0.1, 1.4);
        break;
      case 'beam':
        radial(10, 4, 0.09);
        break;
      case 'thunder':
        radial(16, 7, 0.12);
        break;
      case 'smash':
        radial(20, 9, 0.16);
        break;
    }
    return out;
  }

  update(deltaTime: number) {
    this._elapsed += deltaTime;
    const s = deltaTime / 1000;
    const gravity = ['burst', 'drop', 'bounce', 'slap', 'dash', 'gun', 'thunder', 'smash'].includes(this._view.effect)
      ? 8
      : 0;
    for (const p of this._particles) {
      p.x += p.vx * s;
      p.y += p.vy * s;
      p.vy += gravity * s;
    }
    if (this._elapsed > LIFETIME) {
      this.isDestroy = true;
    }
  }

  render(ctx: CanvasRenderingContext2D, zoom: number, _theme: ColorTheme) {
    const view = this._view;
    const rate = Math.min(1, this._elapsed / LIFETIME);
    const ease = 1 - (1 - rate) ** 3;
    const alpha = 1 - rate * rate;
    const R = view.effectRadius;
    const color = view.color;
    const lw = (w: number) => (w / zoom) * (1.2 - rate * 0.8);

    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.lineCap = 'round';

    const ring = (r: number, w: number, dash?: number[]) => {
      if (r <= 0) return;
      ctx.save();
      if (dash) ctx.setLineDash(dash);
      ctx.lineWidth = lw(w);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };
    const polygon = (r: number, sides: number, w: number, fillAlpha = 0) => {
      ctx.save();
      ctx.lineWidth = lw(w);
      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      if (fillAlpha > 0) {
        ctx.globalAlpha = alpha * fillAlpha;
        ctx.fill();
        ctx.globalAlpha = alpha;
      }
      ctx.stroke();
      ctx.restore();
    };
    const spikes = (n: number, len: number, w: number) => {
      ctx.save();
      ctx.lineWidth = lw(w);
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        ctx.moveTo(Math.cos(a) * len * 0.3, Math.sin(a) * len * 0.3);
        ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      }
      ctx.stroke();
      ctx.restore();
    };

    // 스킬 종류별 링
    switch (view.effect) {
      case 'burst':
        ring(R * ease, 4);
        ring(R * ease * 0.55, 2.5);
        break;
      case 'pull':
        ring(R * (1 - ease) + 0.3, 3);
        ring(R * (1 - ease) * 0.6 + 0.2, 1.5);
        break;
      case 'frost':
        polygon(R * ease, 6, 3);
        spikes(6, R * ease * 1.15, 2.5);
        break;
      case 'grow':
        ring(R * ease, 4);
        ring(R * ease * 0.75, 2);
        break;
      case 'slow':
        ring(R * ease, 2.5, [0.4, 0.3]);
        polygon(R * ease * 0.7, 8, 1.5, 0.15);
        break;
      case 'teleport':
        ring((1 - ease) * 1.6 + 0.2, 3);
        ring(ease * 1.2, 1.5, [0.15, 0.15]);
        break;
      case 'thunder':
        ring(R * ease, 4);
        spikes(8, R * ease * 1.2, 2);
        break;
      case 'smash':
        ring(R * ease, 6);
        ring(R * ease * 0.6, 3);
        break;
      case 'hex':
        ring(R * ease, 3, [0.25, 0.25]);
        polygon(R * ease * 0.6, 5, 2);
        break;
      case 'slap':
        ctx.save();
        ctx.lineWidth = lw(4);
        ctx.beginPath();
        ctx.arc(0, 0, R * ease, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
        ctx.restore();
        break;
      case 'swap':
        ctx.save();
        ctx.lineWidth = lw(3);
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.6, rate * 6, rate * 6 + Math.PI * 0.8);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.6, rate * 6 + Math.PI, rate * 6 + Math.PI * 1.8);
        ctx.stroke();
        ctx.restore();
        break;
      case 'bounce':
        ctx.save();
        ctx.lineWidth = lw(3);
        ctx.beginPath();
        ctx.ellipse(0, 0.2, R * 0.6 * (0.6 + ease), R * 0.25 * (1.2 - ease), 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        break;
      default:
        ring(R * 0.5 * ease, 2);
    }

    // 입자
    for (const p of this._particles) {
      ctx.globalAlpha = alpha * p.life;
      if (view.effect === 'fade') {
        ctx.lineWidth = lw(2);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + rate), 0, Math.PI * 2);
        ctx.stroke();
      } else if (view.effect === 'slap' || view.effect === 'swap') {
        ctx.lineWidth = lw(p.size * zoom * 0.35 + 1);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05);
        ctx.stroke();
      } else if (view.effect === 'float') {
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size, p.size * 0.45, rate * 3 + p.life, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - rate * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 배지가 커지며 떠오르고, 아래에 스킬 이름이 따라붙는다
    if (this._showBadge) {
      ctx.globalAlpha = 1 - rate;
      ctx.shadowBlur = 0;
      ctx.translate(0, -0.6 - ease * 1.6);
      ctx.scale(1 / zoom, 1 / zoom);
      const badgeSize = 22 + 30 * ease;
      drawSkillBadge(ctx, view.skill, 0, 0, badgeSize);
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillStyle = '#ffffff';
      ctx.strokeText(view.name, 0, badgeSize / 2 + 3);
      ctx.fillText(view.name, 0, badgeSize / 2 + 3);
    }
    ctx.restore();
  }
}

/** 번개 돌진의 궤적. 두 점 사이를 지그재그 번개로 잇고 빠르게 사라진다 */
export class LightningTrail implements GameObject {
  position: VectorLike;
  isDestroy = false;
  private _elapsed = 0;
  private _points: [number, number][];
  private _color: string;

  constructor(from: VectorLike, to: VectorLike, color: string, segments = 7, jitter = 0.28) {
    this.position = { x: from.x, y: from.y };
    this._color = color;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    this._points = [[from.x, from.y]];
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const off = rand(-jitter, jitter);
      this._points.push([from.x + dx * t + nx * off, from.y + dy * t + ny * off]);
    }
    this._points.push([to.x, to.y]);
  }

  update(deltaTime: number) {
    this._elapsed += deltaTime;
    if (this._elapsed > 380) this.isDestroy = true;
  }

  render(ctx: CanvasRenderingContext2D, zoom: number) {
    const rate = Math.min(1, this._elapsed / 380);
    ctx.save();
    ctx.globalAlpha = 1 - rate;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = this._color;
    ctx.shadowBlur = 18;
    const trace = () => {
      ctx.beginPath();
      ctx.moveTo(this._points[0][0], this._points[0][1]);
      for (const [x, y] of this._points.slice(1)) ctx.lineTo(x, y);
    };
    ctx.strokeStyle = this._color;
    ctx.lineWidth = 9 / zoom;
    trace();
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3 / zoom;
    trace();
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * 한 점에서 다른 점으로 날아가는 탄(총알·둔화 구체). 도착하면 onArrive를 부른다.
 * 목표가 움직이면 따라가도록 target을 함수로 받는다
 */
export class Projectile implements GameObject {
  position: VectorLike;
  isDestroy = false;
  private _elapsed = 0;
  private _from: VectorLike;
  private _trail: VectorLike[] = [];

  constructor(
    from: VectorLike,
    private _target: () => VectorLike | null,
    private _flightMs: number,
    private _style: { color: string; size: number; arc?: number },
    private _onArrive: (at: VectorLike) => void
  ) {
    this._from = { x: from.x, y: from.y };
    this.position = { x: from.x, y: from.y };
  }

  update(deltaTime: number) {
    if (this.isDestroy) return;
    this._elapsed += deltaTime;
    const target = this._target();
    if (!target) {
      this.isDestroy = true;
      return;
    }
    const t = Math.min(1, this._elapsed / this._flightMs);
    const arc = (this._style.arc ?? 0) * Math.sin(t * Math.PI);
    this.position = {
      x: this._from.x + (target.x - this._from.x) * t,
      y: this._from.y + (target.y - this._from.y) * t - arc,
    };
    this._trail.push({ ...this.position });
    if (this._trail.length > 6) this._trail.shift();
    if (t >= 1) {
      this.isDestroy = true;
      this._onArrive(this.position);
    }
  }

  render(ctx: CanvasRenderingContext2D, zoom: number) {
    const { color, size } = this._style;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.lineCap = 'round';
    if (this._trail.length > 1) {
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = Math.max(size, 3 / zoom);
      ctx.beginPath();
      ctx.moveTo(this._trail[0].x, this._trail[0].y);
      for (const p of this._trail.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** 에네르기파 광선. 굵은 빛줄기와 흰 심이 가늘어지며 사라진다 */
export class BeamEffect implements GameObject {
  isDestroy = false;
  private _elapsed = 0;

  constructor(
    private _from: VectorLike,
    private _to: VectorLike,
    private _color: string,
    private _duration = 450
  ) {}

  update(deltaTime: number) {
    this._elapsed += deltaTime;
    if (this._elapsed > this._duration) this.isDestroy = true;
  }

  render(ctx: CanvasRenderingContext2D, zoom: number) {
    const rate = Math.min(1, this._elapsed / this._duration);
    const width = 0.55 * (1 - rate * 0.7);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.shadowColor = this._color;
    ctx.shadowBlur = 25;
    ctx.globalAlpha = 1 - rate * rate;
    const line = (w: number, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(this._from.x, this._from.y);
      ctx.lineTo(this._to.x, this._to.y);
      ctx.stroke();
    };
    line(width * 2.2, this._color);
    line(Math.max(width * 0.8, 2 / zoom), '#ffffff');
    // 끝에 터지는 빛
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this._to.x, this._to.y, width * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** 광선을 쏘기 전 기를 모으는 구체. 빛 알갱이가 안으로 빨려 들어온다 */
export class ChargeEffect implements GameObject {
  isDestroy = false;
  private _elapsed = 0;

  constructor(
    private _at: () => VectorLike | null,
    private _color: string,
    private _duration: number
  ) {}

  update(deltaTime: number) {
    this._elapsed += deltaTime;
    if (this._elapsed > this._duration || !this._at()) this.isDestroy = true;
  }

  render(ctx: CanvasRenderingContext2D) {
    const at = this._at();
    if (!at) return;
    const rate = Math.min(1, this._elapsed / this._duration);
    ctx.save();
    ctx.shadowColor = this._color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = this._color;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(at.x, at.y, 0.15 + rate * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + rate * 4;
      const d = 1.6 * (1 - rate) + 0.3;
      ctx.beginPath();
      ctx.arc(at.x + Math.cos(a) * d, at.y + Math.sin(a) * d, 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** 두 지점을 잇는 줄(거미줄·염력). 양 끝을 함수로 받아 움직이는 대상을 따라간다 */
export class TetherEffect implements GameObject {
  isDestroy = false;
  private _elapsed = 0;

  constructor(
    private _from: () => VectorLike | null,
    private _to: () => VectorLike | null,
    private _color: string,
    private _duration: number,
    private _style: 'web' | 'force'
  ) {}

  update(deltaTime: number) {
    this._elapsed += deltaTime;
    if (this._elapsed > this._duration || !this._from() || !this._to()) this.isDestroy = true;
  }

  render(ctx: CanvasRenderingContext2D, zoom: number) {
    const a = this._from();
    const b = this._to();
    if (!a || !b) return;
    const rate = Math.min(1, this._elapsed / this._duration);
    ctx.save();
    ctx.globalAlpha = rate > 0.8 ? (1 - rate) * 5 : 1;
    ctx.strokeStyle = this._color;
    ctx.shadowColor = this._color;
    ctx.lineCap = 'round';
    if (this._style === 'web') {
      ctx.shadowBlur = 4;
      ctx.lineWidth = 2.5 / zoom;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      // 벽에 붙은 거미줄 뭉치
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 0.18, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 염력: 일렁이는 물결선
      ctx.shadowBlur = 16;
      ctx.lineWidth = 3 / zoom;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        const wave = Math.sin(t * Math.PI * 6 + this._elapsed / 60) * 0.15 * Math.sin(t * Math.PI);
        const x = a.x + dx * t + nx * wave;
        const y = a.y + dy * t + ny * wave;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha *= 0.35;
      ctx.fillStyle = this._color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** 시간 정지: 시전자에게서 퍼지는 큰 고리와 화면 전체의 잿빛 막 */
export class TimeStopEffect implements GameObject {
  isDestroy = false;
  private _elapsed = 0;

  constructor(
    private _center: VectorLike,
    private _duration: number
  ) {}

  update(deltaTime: number) {
    this._elapsed += deltaTime;
    if (this._elapsed > this._duration) this.isDestroy = true;
  }

  render(ctx: CanvasRenderingContext2D, zoom: number) {
    const rate = Math.min(1, this._elapsed / this._duration);
    const grow = Math.min(1, this._elapsed / 350);
    const fade = rate > 0.85 ? (1 - rate) / 0.15 : 1;
    const { x, y } = this._center;
    ctx.save();
    ctx.globalAlpha = 0.22 * fade;
    ctx.fillStyle = '#4b4b6b';
    ctx.fillRect(x - 60, y - 60, 120, 120);
    ctx.globalAlpha = (1 - grow) * 0.9 + 0.1 * fade;
    ctx.strokeStyle = '#f6e58d';
    ctx.shadowColor = '#f6e58d';
    ctx.shadowBlur = 20;
    ctx.lineWidth = 6 / zoom;
    ctx.beginPath();
    ctx.arc(x, y, grow * 22, 0, Math.PI * 2);
    ctx.stroke();
    // 째깍거리다 멈춘 시계 바늘
    ctx.globalAlpha = 0.8 * fade;
    ctx.lineWidth = 3 / zoom;
    ctx.beginPath();
    ctx.arc(x, y, 1.1, 0, Math.PI * 2);
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 0.85);
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.6, y + 0.2);
    ctx.stroke();
    ctx.restore();
  }
}
