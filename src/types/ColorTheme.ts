interface ShapeColor {
  outline: string;
  fill: string;
  bloom: string;
  bloomRadius: number;
}

/** 배경 위에 깔리는 장식 무늬 */
export type BackgroundPattern = 'dots';

/** 구슬을 그리는 방식. flat=원본 단색, steel=강철구슬 */
export type MarbleStyle = 'flat' | 'steel';

/** 장애물을 그리는 방식. plain=원본 */
export type EntityStyle = 'plain' | 'pinball';

export interface ColorTheme {
  background: string;
  marbleLightness: number;
  marbleWinningBorder: string;
  skillColor: string;
  coolTimeIndicator: string;
  entity: {
    box: ShapeColor;
    circle: ShapeColor;
    polyline: ShapeColor;
  };
  rankStroke: string;
  minimapBackground: string;
  minimapViewport: string;
  winnerText: string;
  winnerOutline: string;
  winnerBackground: string;
  pattern?: BackgroundPattern;
  patternColor?: string;
  marbleStyle: MarbleStyle;
  entityStyle: EntityStyle;
  /** 구슬 이름·HUD 글꼴 */
  font: string;
}
