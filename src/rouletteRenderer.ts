import type { Camera } from './camera';
import { closeButtonSize, drawCloseCircle, type Rect } from './closeButton';
import { canvasHeight, canvasWidth, initialZoom, Themes, winnerAreaHeight } from './data/constants';
import type { StageDef } from './data/maps';
import type { GameObject } from './gameObject';
import type { Marble } from './marble';
import { MINIMAP_INSET, MINIMAP_WIDTH } from './minimap';
import type { WinnerRange } from './options';
import type { ParticleManager } from './particleManager';
import type { ColorTheme, EntityStyle } from './types/ColorTheme';
import type { MapEntityState } from './types/MapEntity.type';
import type { VectorLike } from './types/VectorLike';
import type { UIObject } from './UIObject';

export type RenderParameters = {
  camera: Camera;
  stage: StageDef;
  entities: MapEntityState[];
  marbles: Marble[];
  winners: Marble[];
  particleManager: ParticleManager;
  effects: GameObject[];
  winnerRange: WinnerRange;
  /** 진행 중에는 null, 당첨자가 모두 확정되면 당첨자 배열 */
  result: Marble[] | null;
  size: VectorLike;
  theme: ColorTheme;
};

/** 화면 배율(devicePixelRatio)은 이 값까지만 반영한다. 그 이상은 비용 대비 차이가 없다 */
const MAX_PIXEL_RATIO = 2;
/** 실제 캔버스 픽셀 폭 상한. 4K에서도 그림자(bloom) 비용이 감당되는 선 */
const MAX_PHYSICAL_WIDTH = 2560;
const WINNER_TEXT_OFFSET = 30;
const RESULT_PANEL_MAX_WIDTH_RATIO = 0.9;
const RESULT_PANEL_MAX_HEIGHT_RATIO = 0.8;
const RESULT_COLUMN_MAX_WIDTH = 280;
const PROGRESS_MAX_WIDTH_RATIO = 0.3;
const PROGRESS_ACCENT = 'rgba(255, 215, 0, 0.8)';

/** 판타지 테마의 별. 매 프레임 같은 자리에 있어야 하므로 한 번만 뽑아 둔다 ([x비율, y비율, 크기 0~1]) */
const STARS: [number, number, number][] = (() => {
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: 140 }, () => [rand(), rand(), rand()]);
})();

function inRect(rect: Rect | undefined, x: number, y: number): boolean {
  return !!rect && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

export class RouletteRenderer {
  protected _canvas!: HTMLCanvasElement;
  protected ctx!: CanvasRenderingContext2D;
  /** 마우스 좌표(CSS px) → 논리 좌표 변환 계수 */
  public sizeFactor = 1;
  /**
   * 그리기 코드는 전부 "논리 픽셀"(CSS 폭의 절반) 기준이다. 시야와 HUD 비율을 원본과 같게
   * 유지하면서, 실제 캔버스는 디스플레이 배율만큼 크게 잡고 변환으로 확대해 선명하게 그린다
   */
  private _logicalWidth = canvasWidth;
  private _logicalHeight = canvasHeight;
  /** 논리 픽셀 1개당 실제 캔버스 픽셀 수 */
  private _pixelRatio = 1;

  protected _images: { [key: string]: HTMLImageElement } = {};
  protected _theme: ColorTheme = Themes.dark;
  private _resultCloseRect: Rect | null = null;
  private _resultPopupClosed = false;
  private _lastResult: Marble[] | null = null;

  get width() {
    return this._logicalWidth;
  }

  get height() {
    return this._logicalHeight;
  }

  get pixelRatio() {
    return this._pixelRatio;
  }

  get canvas() {
    return this._canvas;
  }

  set theme(value: ColorTheme) {
    this._theme = value;
  }

  async init() {
    await this._load();

    this._canvas = document.createElement('canvas');
    this._canvas.width = canvasWidth;
    this._canvas.height = canvasHeight;
    this.ctx = this._canvas.getContext('2d', {
      alpha: false,
    }) as CanvasRenderingContext2D;

    document.body.appendChild(this._canvas);

    const resizing = (entries?: ResizeObserverEntry[]) => {
      const realSize = entries ? entries[0].contentRect : this._canvas.getBoundingClientRect();
      if (realSize.width <= 0 || realSize.height <= 0) return;

      // 논리 크기는 원본 규칙 그대로(CSS 폭의 절반, 최소 640). 카메라 시야가 여기에 묶여 있다
      const width = Math.max(realSize.width / 2, 640);
      const height = (width / realSize.width) * realSize.height;
      this._logicalWidth = width;
      this._logicalHeight = height;
      this.sizeFactor = width / realSize.width;

      // 실제 픽셀은 CSS 크기 × 디스플레이 배율. 예전엔 논리 크기로 그린 뒤 확대해서 흐렸다
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      const physicalWidth = Math.min(Math.round(realSize.width * dpr), MAX_PHYSICAL_WIDTH);
      this._pixelRatio = physicalWidth / width;
      this._canvas.width = physicalWidth;
      this._canvas.height = Math.round(height * this._pixelRatio);
      // 크기를 바꾸면 컨텍스트 상태가 초기화되므로 여기서 다시 잡는다
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
    };

    const resizeObserver = new ResizeObserver(resizing);

    resizeObserver.observe(this._canvas);
    resizing();
  }

  private async _loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((rs) => {
      const img = new Image();
      img.addEventListener('load', () => {
        rs(img);
      });
      img.src = url;
    });
  }

  private async _load(): Promise<void> {
    const loadPromises = [
      { name: '챔루', imgUrl: new URL('../assets/images/chamru.png', import.meta.url) },
      { name: '쿠빈', imgUrl: new URL('../assets/images/kubin.png', import.meta.url) },
      { name: '꽉변', imgUrl: new URL('../assets/images/kkwak.png', import.meta.url) },
      { name: '꽉변호사', imgUrl: new URL('../assets/images/kkwak.png', import.meta.url) },
      { name: '꽉 변호사', imgUrl: new URL('../assets/images/kkwak.png', import.meta.url) },
      { name: '주누피', imgUrl: new URL('../assets/images/junyoop.png', import.meta.url) },
      { name: '왈도쿤', imgUrl: new URL('../assets/images/waldokun.png', import.meta.url) },
    ].map(({ name, imgUrl }) => {
      return (async () => {
        this._images[name] = await this._loadImage(imgUrl.toString());
      })();
    });

    loadPromises.push(
      (async () => {
        await this._loadImage(new URL('../assets/images/ff.svg', import.meta.url).toString());
      })()
    );

    await Promise.all(loadPromises);
  }

  private getMarbleImage(name: string): CanvasImageSource | undefined {
    return this._images[name];
  }

  protected onBeforeEntities(): void {}
  protected onAfterScene(): void {}

  render(renderParameters: RenderParameters, uiObjects: UIObject[]) {
    this._theme = renderParameters.theme;
    // 이 아래는 전부 논리 픽셀 좌표. 실제 픽셀로의 확대는 이 변환 하나가 담당한다
    this.ctx.setTransform(this._pixelRatio, 0, 0, this._pixelRatio, 0, 0);
    this.ctx.fillStyle = this._theme.background;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.renderPattern(this._theme);

    this.ctx.save();
    this.ctx.scale(initialZoom, initialZoom);
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.font = '0.4pt sans-serif';
    this.ctx.lineWidth = 3 / (renderParameters.camera.zoom + initialZoom);
    renderParameters.camera.renderScene(this.ctx, { x: this.width, y: this.height }, () => {
      this.onBeforeEntities();
      this.renderEntities(renderParameters.entities);
      this.renderEffects(renderParameters);
      this.renderMarbles(renderParameters);
    });
    this.ctx.restore();
    this.onAfterScene();

    uiObjects.forEach((obj) => obj.render(this.ctx, renderParameters, this.width, this.height));
    renderParameters.particleManager.render(this.ctx);
    this.renderWinnerProgress(renderParameters);
    this.renderResult(renderParameters);
  }

  /** 테마 배경 무늬. 화면(논리 픽셀)에 고정되어 카메라를 따라 움직이지 않는다 */
  private renderPattern(theme: ColorTheme) {
    if (!theme.pattern || !theme.patternColor) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    ctx.save();
    ctx.fillStyle = theme.patternColor;
    ctx.strokeStyle = theme.patternColor;
    switch (theme.pattern) {
      case 'dots':
        for (let y = 20; y < h; y += 40) {
          for (let x = 20; x < w; x += 40) {
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      case 'stars':
        for (const [sx, sy, size] of STARS) {
          ctx.globalAlpha = 0.3 + size * 0.5;
          ctx.beginPath();
          ctx.arc(sx * w, sy * h, 0.6 + size * 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 'grid':
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x < w; x += 48) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
        }
        for (let y = 0; y < h; y += 48) {
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
        }
        ctx.stroke();
        break;
      case 'paper':
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let y = 36; y < h; y += 32) {
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
        }
        ctx.stroke();
        // 공책의 빨간 세로 여백선
        ctx.strokeStyle = 'rgba(214, 48, 49, 0.35)';
        ctx.beginPath();
        ctx.moveTo(w * 0.12, 0);
        ctx.lineTo(w * 0.12, h);
        ctx.stroke();
        break;
    }
    ctx.restore();
  }

  /** 장애물. 테마의 entityStyle에 따라 크롬 레일·보석 범퍼·네온관·연필 낙서로 다르게 꾸민다 */
  private renderEntities(entities: MapEntityState[]) {
    const ctx = this.ctx;
    const style = this._theme.entityStyle;
    ctx.save();
    entities.forEach((entity) => {
      const transform = ctx.getTransform();
      ctx.translate(entity.x, entity.y);
      ctx.rotate(entity.angle);
      const colors = this._theme.entity[entity.shape.type];
      const fill = entity.shape.color ?? colors.fill;
      const outline = entity.shape.color ?? colors.outline;
      ctx.fillStyle = fill;
      ctx.strokeStyle = outline;
      ctx.shadowBlur = colors.bloomRadius * this._pixelRatio;
      ctx.shadowColor = entity.shape.bloomColor ?? entity.shape.color ?? colors.bloom;
      const shape = entity.shape;
      const lw = ctx.lineWidth;
      switch (shape.type) {
        case 'polyline':
          this.drawPolyline(shape.points, style, lw, outline);
          break;
        case 'box':
          ctx.rotate(shape.rotation);
          this.drawBox(shape.width * 2, shape.height * 2, style, lw, fill);
          break;
        case 'circle':
          this.drawCircle(shape.radius, style, lw, fill);
          break;
      }
      ctx.lineWidth = lw;
      ctx.setTransform(transform);
    });
    ctx.restore();
  }

  private tracePolyline(points: [number, number][]) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
  }

  private drawPolyline(points: [number, number][], style: EntityStyle, lw: number, outline: string) {
    if (points.length === 0) return;
    const ctx = this.ctx;
    switch (style) {
      case 'pinball':
        // 크롬 레일: 굵고 어두운 바탕선 위에 밝은 선
        this.tracePolyline(points);
        ctx.lineWidth = lw * 3;
        ctx.strokeStyle = 'rgba(30, 30, 30, 0.9)';
        ctx.stroke();
        this.tracePolyline(points);
        ctx.lineWidth = lw * 1.3;
        ctx.strokeStyle = outline;
        ctx.stroke();
        break;
      case 'fantasy':
        // 덩굴처럼 감긴 빛
        this.tracePolyline(points);
        ctx.lineWidth = lw * 1.5;
        ctx.stroke();
        ctx.save();
        ctx.setLineDash([0.35, 0.55]);
        ctx.lineWidth = lw * 3.5;
        ctx.globalAlpha *= 0.35;
        this.tracePolyline(points);
        ctx.stroke();
        ctx.restore();
        break;
      case 'cyber':
        // 네온관: 넓고 흐린 빛 위에 가늘고 흰 심지
        ctx.save();
        ctx.globalAlpha *= 0.4;
        ctx.lineWidth = lw * 4;
        this.tracePolyline(points);
        ctx.stroke();
        ctx.restore();
        this.tracePolyline(points);
        ctx.lineWidth = lw;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        break;
      case 'sketch':
        // 연필로 두 번 그은 선
        ctx.save();
        ctx.lineWidth = lw * 1.4;
        ctx.globalAlpha *= 0.85;
        this.tracePolyline(points);
        ctx.stroke();
        ctx.translate(0.06, 0.05);
        ctx.globalAlpha *= 0.5;
        this.tracePolyline(points);
        ctx.stroke();
        ctx.restore();
        break;
      default:
        this.tracePolyline(points);
        ctx.stroke();
    }
  }

  private drawBox(w: number, h: number, style: EntityStyle, lw: number, fill: string) {
    const ctx = this.ctx;
    const rect = () => ctx.fillRect(-w / 2, -h / 2, w, h);
    const frame = () => ctx.strokeRect(-w / 2, -h / 2, w, h);
    switch (style) {
      case 'pinball':
        rect();
        frame();
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = lw * 0.8;
        ctx.beginPath();
        ctx.moveTo(-w / 2 + lw, -h / 2 + lw);
        ctx.lineTo(w / 2 - lw, -h / 2 + lw);
        ctx.stroke();
        ctx.restore();
        break;
      case 'fantasy': {
        const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
        g.addColorStop(0, '#fff6c8');
        g.addColorStop(0.5, fill);
        g.addColorStop(1, '#8a5a12');
        ctx.fillStyle = g;
        rect();
        frame();
        break;
      }
      case 'cyber':
        ctx.save();
        ctx.globalAlpha *= 0.35;
        rect();
        ctx.restore();
        ctx.lineWidth = lw * 1.6;
        frame();
        break;
      case 'sketch':
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.globalAlpha *= 0.25;
        rect();
        ctx.globalAlpha /= 0.25;
        ctx.globalAlpha *= 0.9;
        ctx.lineWidth = lw * 1.4;
        frame();
        ctx.translate(0.05, 0.04);
        ctx.globalAlpha *= 0.45;
        frame();
        ctx.restore();
        break;
      default:
        rect();
        frame();
    }
  }

  private drawCircle(r: number, style: EntityStyle, lw: number, fill: string) {
    const ctx = this.ctx;
    const circle = (rr: number) => {
      ctx.beginPath();
      ctx.arc(0, 0, rr, 0, Math.PI * 2, false);
    };
    switch (style) {
      case 'pinball':
        // 핀볼 범퍼: 반투명 채움, 굵은 테, 흰 안쪽 링과 중심 점
        circle(r);
        ctx.save();
        ctx.globalAlpha *= 0.35;
        ctx.fill();
        ctx.restore();
        circle(r);
        ctx.lineWidth = lw * 2;
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = lw;
        circle(r * 0.55);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        circle(r * 0.18);
        ctx.fill();
        break;
      case 'fantasy': {
        // 마법 구슬: 밝은 심에서 색으로 번지는 구면
        const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.05, 0, 0, r);
        g.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        g.addColorStop(0.6, fill);
        g.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
        circle(r);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.lineWidth = lw;
        ctx.stroke();
        break;
      }
      case 'cyber':
        circle(r);
        ctx.lineWidth = lw * 2;
        ctx.stroke();
        ctx.save();
        ctx.setLineDash([r * 0.35, r * 0.25]);
        ctx.lineWidth = lw;
        circle(r * 0.65);
        ctx.stroke();
        ctx.restore();
        break;
      case 'sketch':
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.lineWidth = lw * 1.5;
        ctx.globalAlpha *= 0.9;
        circle(r);
        ctx.stroke();
        ctx.translate(0.05, 0.04);
        ctx.globalAlpha *= 0.45;
        circle(r * 0.96);
        ctx.stroke();
        ctx.restore();
        break;
      default:
        circle(r);
        ctx.stroke();
    }
  }

  private renderEffects({ effects, camera }: RenderParameters) {
    effects.forEach((effect) => effect.render(this.ctx, camera.zoom * initialZoom, this._theme));
  }

  private renderMarbles({ marbles, camera, winnerRange, winners, size }: RenderParameters) {
    const firstIndex = winnerRange.start - winners.length;
    const lastIndex = winnerRange.end - winners.length;

    const viewPort = { x: camera.x, y: camera.y, w: size.x, h: size.y, zoom: camera.zoom * initialZoom };
    marbles.forEach((marble, i) => {
      marble.render(
        this.ctx,
        camera.zoom * initialZoom,
        i >= firstIndex && i <= lastIndex,
        false,
        this.getMarbleImage(marble.name),
        viewPort,
        this._theme
      );
    });
  }

  private renderResult(params: RenderParameters) {
    const result = params.result;
    // 새 결과가 나오면(또는 리셋되면) 닫힘 상태를 푼다. _result는 확정될 때마다 새 배열이다
    if (result !== this._lastResult) {
      this._lastResult = result;
      this._resultPopupClosed = false;
    }
    this._resultCloseRect = null;
    if (!result) return;
    // 1명이면 기존 하단 Winner 표시, 여러명이면 화면 중앙 당첨자 목록 팝업
    if (result.length === 1) {
      this.renderWinner(result[0], params.theme);
    } else if (!this._resultPopupClosed) {
      this.renderWinnerList(result, params);
    }
  }

  /** 결과 팝업 닫기 버튼을 눌렀는지 */
  getResultCloseHitAt(x: number, y: number): boolean {
    return inRect(this._resultCloseRect ?? undefined, x, y);
  }

  closeResultPopup(): void {
    this._resultPopupClosed = true;
  }

  /**
   * 여러명 모드에서 확정된 당첨자를 좌측 상단에 상시 표시한다.
   * 우측은 랭킹 리스트가 구슬 수만큼 내려오므로 겹친다. 좌측은 미니맵이 세로로 긴
   * 스트립이라 그 오른쪽에 붙인다.
   */
  private renderWinnerProgress({ winners, winnerRange, result, theme }: RenderParameters) {
    const { start, end } = winnerRange;
    if (end <= start) return; // 1명 추첨은 기존 하단 Winner 표시를 쓴다

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const lineHeight = Math.min(24, Math.max(14, h * 0.042));
    const pad = lineHeight * 0.6;
    const rankWidth = lineHeight * 1.9;
    const headerFont = `bold ${lineHeight * 0.7}px sans-serif`;
    const rankFont = `${lineHeight * 0.6}px sans-serif`;
    const nameFont = `bold ${lineHeight * 0.72}px sans-serif`;

    // 확정 전에는 골인한 당첨자만, 확정 후에는 최종 명단(조기 확정분 포함)을 쓴다
    const confirmed = result ?? winners.slice(start, end + 1);
    const header = `Winners ${confirmed.length} / ${end - start + 1}`;

    // 화면을 넘기면 오래된 쪽을 접는다. 전체 명단은 어차피 중앙 팝업에서 보여준다
    const maxRows = Math.max(1, Math.floor((h * 0.55) / lineHeight) - 2);
    const hidden = Math.max(0, confirmed.length - maxRows);
    const shown = confirmed.slice(hidden);
    const foldLabel = `+${hidden} more`;

    ctx.save();

    ctx.font = headerFont;
    let contentW = ctx.measureText(header).width;
    ctx.font = nameFont;
    for (const marble of shown) {
      contentW = Math.max(contentW, rankWidth + ctx.measureText(marble.name).width);
    }
    if (hidden > 0) {
      ctx.font = rankFont;
      contentW = Math.max(contentW, ctx.measureText(foldLabel).width);
    }

    const panelW = Math.min(contentW + pad * 2, w * PROGRESS_MAX_WIDTH_RATIO);
    const rows = shown.length + (hidden > 0 ? 1 : 0);
    // 헤더와 목록 사이 간격은 목록이 있을 때만 준다. 항상 주면 당첨자가 없을 때
    // 아래쪽에만 빈 공간이 남아 위아래 여백이 어긋난다
    const headerGap = rows > 0 ? lineHeight * 0.35 : 0;
    const panelH = pad * 2 + lineHeight + headerGap + rows * lineHeight;
    const panelX = MINIMAP_INSET + MINIMAP_WIDTH + pad;
    const panelY = MINIMAP_INSET; // 미니맵 상단과 맞춘다

    ctx.fillStyle = theme.winnerBackground;
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = PROGRESS_ACCENT;
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = headerFont;
    ctx.fillStyle = theme.winnerText;
    ctx.fillText(header, panelX + pad, panelY + pad + lineHeight / 2);

    let y = panelY + pad + lineHeight + headerGap + lineHeight / 2;
    if (hidden > 0) {
      ctx.font = rankFont;
      ctx.fillStyle = theme.winnerText;
      ctx.fillText(foldLabel, panelX + pad, y);
      y += lineHeight;
    }

    shown.forEach((marble, i) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(panelX, y - lineHeight / 2, panelW, lineHeight);
      ctx.clip();

      ctx.font = rankFont;
      ctx.fillStyle = theme.winnerText;
      ctx.fillText(`#${start + hidden + i + 1}`, panelX + pad, y);

      ctx.font = nameFont;
      ctx.fillStyle = `hsl(${marble.hue} 100% ${theme.marbleLightness}%)`;
      ctx.fillText(marble.name, panelX + pad + rankWidth, y);
      ctx.restore();
      y += lineHeight;
    });

    ctx.restore();
  }

  /** 당첨자가 여러명일 때 화면 중앙에 목록 팝업을 그린다 */
  private renderWinnerList(winners: Marble[], { theme, winnerRange }: RenderParameters) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const lineHeight = Math.min(32, Math.max(16, h * 0.05));
    const padding = lineHeight;
    const titleHeight = lineHeight * 2;

    // 세로로 다 안 들어가면 열을 늘린다
    const maxRows = Math.max(
      1,
      Math.floor((h * RESULT_PANEL_MAX_HEIGHT_RATIO - titleHeight - padding * 2) / lineHeight)
    );
    const cols = Math.max(1, Math.ceil(winners.length / maxRows));
    const rows = Math.ceil(winners.length / cols);

    const colWidth = Math.min(RESULT_COLUMN_MAX_WIDTH, (w * RESULT_PANEL_MAX_WIDTH_RATIO - padding * 2) / cols);
    const panelW = colWidth * cols + padding * 2;
    const panelH = titleHeight + rows * lineHeight + padding;
    const panelX = (w - panelW) / 2;
    const panelY = (h - panelH) / 2;

    ctx.save();

    ctx.fillStyle = theme.winnerBackground;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = theme.background;
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = theme.winnerText;
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = theme.winnerText;
    ctx.font = `bold ${lineHeight * 1.1}px sans-serif`;
    ctx.fillText(`Winners (${winners.length})`, w / 2, panelY + titleHeight / 2);

    // 버튼 중심을 팝업 우상단 꼭지점에 맞춰 걸쳐놓는다. 뒤가 비치지 않게 불투명하게 채우되,
    // 검정으로 채우면 다크 테마에서 배경과 같아져 버튼으로 안 보이므로 대비되는 색을 쓴다
    this._resultCloseRect = drawCloseCircle(ctx, panelX + panelW, panelY, closeButtonSize(h), '#222');

    const rankWidth = lineHeight * 1.8;
    winners.forEach((marble, i) => {
      const col = Math.floor(i / rows);
      const row = i % rows;
      const x = panelX + padding + col * colWidth;
      const y = panelY + titleHeight + row * lineHeight + lineHeight / 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y - lineHeight / 2, colWidth, lineHeight);
      ctx.clip();

      ctx.textAlign = 'right';
      ctx.fillStyle = theme.winnerText;
      ctx.font = `${lineHeight * 0.6}px sans-serif`;
      ctx.fillText(`#${winnerRange.start + i + 1}`, x + rankWidth * 0.8, y);

      ctx.textAlign = 'left';
      ctx.fillStyle = `hsl(${marble.hue} 100% ${theme.marbleLightness}%)`;
      ctx.font = `bold ${lineHeight * 0.75}px sans-serif`;
      ctx.fillText(marble.name, x + rankWidth, y);
      ctx.restore();
    });

    ctx.restore();
  }

  private renderWinner(winner: Marble, theme: ColorTheme) {
    this.ctx.save();
    this.ctx.fillStyle = theme.winnerBackground;
    this.ctx.fillRect(this.width / 2, this.height - winnerAreaHeight, this.width / 2, winnerAreaHeight);

    // Draw marble image or colored circle
    const marbleSize = 100;
    const marbleCenterX = this.width - marbleSize / 2 - 20;
    const marbleCenterY = this.height - winnerAreaHeight / 2;
    const marbleImage = this.getMarbleImage(winner.name);

    if (marbleImage) {
      this.ctx.drawImage(
        marbleImage,
        marbleCenterX - marbleSize / 2,
        marbleCenterY - marbleSize / 2,
        marbleSize,
        marbleSize
      );
    } else {
      this.ctx.beginPath();
      this.ctx.arc(marbleCenterX, marbleCenterY, marbleSize / 2, 0, Math.PI * 2);
      this.ctx.fillStyle = `hsl(${winner.hue} 100% ${theme.marbleLightness})`;
      this.ctx.fill();
    }

    this.ctx.fillStyle = theme.winnerText;
    this.ctx.strokeStyle = theme.winnerOutline;

    this.ctx.font = 'bold 48px sans-serif';
    this.ctx.textAlign = 'right';
    this.ctx.lineWidth = 4;
    const textRightX = marbleCenterX - marbleSize / 2 - 20;
    if (theme.winnerOutline) {
      this.ctx.strokeText('Winner', textRightX, this.height - 120 + WINNER_TEXT_OFFSET);
    }

    this.ctx.fillText('Winner', textRightX, this.height - 120 + WINNER_TEXT_OFFSET);
    this.ctx.font = 'bold 72px sans-serif';
    this.ctx.fillStyle = `hsl(${winner.hue} 100% ${theme.marbleLightness})`;
    if (theme.winnerOutline) {
      this.ctx.strokeText(winner.name, textRightX, this.height - 55 + WINNER_TEXT_OFFSET);
    }
    this.ctx.fillText(winner.name, textRightX, this.height - 55 + WINNER_TEXT_OFFSET);
    this.ctx.restore();
  }
}
