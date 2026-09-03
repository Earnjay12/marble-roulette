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

  constructor(x: number, y: number, skill: Skills) {
    this.position = { x, y };
    this._view = getSkillView(skill);
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
    const stream = (n: number, vyMin: number, vyMax: number, spread: number, size: number) => {
      for (let i = 0; i < n; i++) {
        out.push({
          x: rand(-spread, spread),
          y: rand(-0.3, 0.3),
          vx: rand(-0.4, 0.4),
          vy: rand(vyMin, vyMax),
          size,
          life: rand(0.6, 1),
        });
      }
    };

    switch (this._view.effect) {
      case 'burst':
        radial(18, R * 1.5, 0.16);
        break;
      case 'down':
        stream(10, 6, 12, 0.5, 0.1);
        break;
      case 'boost':
        stream(10, 9, 16, 0.4, 0.09);
        break;
      case 'up':
        stream(10, -12, -6, 0.5, 0.1);
        break;
      case 'slap':
        stream(8, -9, -4, 0.7, 0.12);
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
      case 'rise':
        for (let i = 0; i < 9; i++) {
          out.push({
            x: rand(-0.6, 0.6),
            y: rand(0, 0.4),
            vx: rand(-0.3, 0.3),
            vy: rand(-4, -2),
            size: rand(0.08, 0.2),
            life: rand(0.6, 1),
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
      case 'shrink':
        radial(12, -3, 0.1, 2.2);
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
      case 'stop':
        radial(8, 2, 0.1);
        break;
      case 'swap':
        for (let i = 0; i < 10; i++) {
          const dir = i % 2 === 0 ? 1 : -1;
          out.push({ x: rand(-0.3, 0.3), y: 0, vx: 0, vy: dir * rand(3, 6), size: 0.1, life: rand(0.6, 1) });
        }
        break;
      case 'slow':
        radial(12, R * 0.45, 0.09);
        break;
      case 'zigzag':
        for (let i = 0; i < 8; i++) {
          const dir = i % 2 === 0 ? 1 : -1;
          out.push({ x: 0, y: rand(-0.3, 0.3), vx: dir * rand(4, 8), vy: rand(-1, 1), size: 0.1, life: rand(0.6, 1) });
        }
        break;
      case 'hex':
        radial(12, 3, 0.12);
        break;
      case 'shield':
        radial(12, 2.5, 0.1);
        break;
    }
    return out;
  }

  update(deltaTime: number) {
    this._elapsed += deltaTime;
    const s = deltaTime / 1000;
    const gravity = ['burst', 'drop', 'zigzag', 'stop', 'bounce', 'slap'].includes(this._view.effect) ? 8 : 0;
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
      case 'shrink':
        ring(2.2 * (1 - ease) + 0.3, 3);
        break;
      case 'stop':
        polygon(R * (0.55 + 0.45 * ease), 8, 4, 0.3);
        break;
      case 'slow':
        ring(R * ease, 2.5, [0.4, 0.3]);
        ctx.save();
        ctx.lineWidth = lw(3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(
          Math.cos(rate * Math.PI * 4 - Math.PI / 2) * R * 0.5,
          Math.sin(rate * Math.PI * 4 - Math.PI / 2) * R * 0.5
        );
        ctx.stroke();
        ctx.restore();
        break;
      case 'shield':
        polygon(R * (0.5 + 0.5 * ease), 6, 4, 0.25);
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
    const streak = ['down', 'up', 'boost', 'slap', 'swap', 'zigzag'].includes(view.effect);
    for (const p of this._particles) {
      ctx.globalAlpha = alpha * p.life;
      if (view.effect === 'fade') {
        ctx.lineWidth = lw(2);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + rate), 0, Math.PI * 2);
        ctx.stroke();
      } else if (streak) {
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
    ctx.restore();
  }
}
