import { SkillInfos, Skills } from './data/constants';
import type { GameObject } from './gameObject';
import type { ColorTheme } from './types/ColorTheme';
import type { VectorLike } from './types/VectorLike';

const lifetime = 600;

/** 스킬이 발동한 자리에 퍼지는 링과 아이콘 */
export class SkillEffect implements GameObject {
  private _size: number = 0;
  position: VectorLike;
  private _elapsed: number = 0;
  private _skill: Skills;
  isDestroy: boolean = false;

  constructor(x: number, y: number, skill: Skills = Skills.Impact) {
    this.position = { x, y };
    this._skill = skill;
  }

  update(deltaTime: number) {
    this._elapsed += deltaTime;
    this._size = (this._elapsed / lifetime) * SkillInfos[this._skill].effectRadius;
    if (this._elapsed > lifetime) {
      this.isDestroy = true;
    }
  }

  render(ctx: CanvasRenderingContext2D, zoom: number, theme: ColorTheme) {
    const info = SkillInfos[this._skill];
    const rate = this._elapsed / lifetime;
    ctx.save();
    ctx.globalAlpha = 1 - rate * rate;
    ctx.strokeStyle = this._skill === Skills.Impact ? theme.skillColor : info.color;
    ctx.lineWidth = 1.5 / zoom;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this._size, 0, Math.PI * 2);
    ctx.stroke();

    if (info.icon) {
      // 아이콘은 화면 픽셀 크기로 그리고 위로 떠오르게 한다
      ctx.translate(this.position.x, this.position.y - rate * 1.2);
      ctx.scale(1 / zoom, 1 / zoom);
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(info.icon, 0, 0);
    }
    ctx.restore();
  }
}
