import { SkillInfos } from './data/constants';
import type { Marble } from './marble';
import options, { type WinnerRange } from './options';
import type { RenderParameters } from './rouletteRenderer';
import type { Rect } from './types/rect.type';
import type { MouseEventArgs, UIObject } from './UIObject';
import { bound } from './utils/bound.decorator';

export class RankRenderer implements UIObject {
  private _currentY = 0;
  private _targetY = 0;
  private fontHeight = 16;
  private _userMoved = 0;
  private _currentWinner = -1;
  private maxY = 0;
  private winners: Marble[] = [];
  private marbles: Marble[] = [];
  private winnerRange: WinnerRange = { start: 0, end: 0 };
  private messageHandler?: (msg: string) => void;

  @bound
  onWheel(e: WheelEvent) {
    this._targetY += e.deltaY;
    if (this._targetY > this.maxY) {
      this._targetY = this.maxY;
    }
    this._userMoved = 2000;
  }

  @bound
  onDblClick(e?: MouseEventArgs) {
    if (e) {
      if (navigator.clipboard) {
        const tsv: string[] = [];
        let rank = 0;
        tsv.push(
          ...[...this.winners, ...this.marbles].map((m) => {
            rank++;
            return [rank.toString(), m.name, this.isWinningRank(rank - 1) ? '☆' : ''].join('\t');
          })
        );

        tsv.unshift(['Rank', 'Name', 'Winner'].join('\t'));

        navigator.clipboard.writeText(tsv.join('\n')).then(() => {
          if (this.messageHandler) {
            this.messageHandler('The result has been copied');
          }
        });
      }
    }
  }

  private isWinningRank(rank: number) {
    return rank >= this.winnerRange.start && rank <= this.winnerRange.end;
  }

  onMessage(func: (msg: string) => void) {
    this.messageHandler = func;
  }

  render(
    ctx: CanvasRenderingContext2D,
    { winners, marbles, winnerRange, theme }: RenderParameters,
    width: number,
    height: number
  ) {
    const startX = width - 5;
    const startY = Math.max(-this.fontHeight, this._currentY - height / 2);
    this.maxY = Math.max(0, (marbles.length + winners.length) * this.fontHeight + this.fontHeight);
    this._currentWinner = winners.length;

    this.winners = winners;
    this.marbles = marbles;
    this.winnerRange = winnerRange;

    ctx.save();
    ctx.textAlign = 'right';
    ctx.font = '10pt sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText(`${winners.length} / ${winners.length + marbles.length}`, width - 5, this.fontHeight);

    ctx.beginPath();
    ctx.rect(width - 150, this.fontHeight + 2, width, this.maxY);
    ctx.clip();

    ctx.translate(0, -startY);

    if (winnerRange.end > winnerRange.start) {
      ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
      const bandY = winnerRange.start * this.fontHeight + this.fontHeight / 2;
      const bandH = (winnerRange.end - winnerRange.start + 1) * this.fontHeight;
      ctx.fillRect(width - 150, bandY, 150, bandH);
      ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
      ctx.fillRect(width - 150, bandY, 3, bandH);
    }

    ctx.font = 'bold 11pt sans-serif';
    if (theme.rankStroke) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = theme.rankStroke;
    }
    // 능력 모드에서는 이름 앞에 능력 아이콘을 붙여 목록에서도 한눈에 보이게 한다
    const label = (marble: Marble) =>
      options.skillMode === 'rpg' && SkillInfos[marble.ability].icon
        ? `${SkillInfos[marble.ability].icon} ${marble.name}`
        : marble.name;
    winners.forEach((marble, rank) => {
      const y = rank * this.fontHeight;
      if (y >= startY && y <= startY + ctx.canvas.height) {
        ctx.fillStyle = `hsl(${marble.hue} 100% ${theme.marbleLightness}`;
        const text = `${this.isWinningRank(rank) ? '☆' : '✔'} ${label(marble)} #${rank + 1}`;
        ctx.strokeText(text, startX, 20 + y);
        ctx.fillText(text, startX, 20 + y);
      }
    });
    ctx.font = '10pt sans-serif';
    marbles.forEach((marble, rank) => {
      const y = (rank + winners.length) * this.fontHeight;
      if (y >= startY && y <= startY + ctx.canvas.height) {
        ctx.fillStyle = `hsl(${marble.hue} 100% ${theme.marbleLightness}`;
        const text = `${label(marble)} #${rank + 1 + winners.length}`;
        ctx.strokeText(text, startX, 20 + y);
        ctx.fillText(text, startX, 20 + y);
      }
    });
    ctx.restore();
  }

  update(deltaTime: number) {
    if (this._currentWinner === -1) {
      return;
    }
    if (this._userMoved > 0) {
      this._userMoved -= deltaTime;
    } else {
      this._targetY = this._currentWinner * this.fontHeight + this.fontHeight;
    }
    if (this._currentY !== this._targetY) {
      this._currentY += (this._targetY - this._currentY) * (deltaTime / 250);
    }
    if (Math.abs(this._currentY - this._targetY) < 1) {
      this._currentY = this._targetY;
    }
  }

  getBoundingBox(): Rect | null {
    return null;
  }
}
