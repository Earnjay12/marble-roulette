interface ShapeColor {
  outline: string;
  fill: string;
  bloom: string;
  bloomRadius: number;
}

/** 배경 위에 깔리는 장식 무늬 */
export type BackgroundPattern = 'dots' | 'stars' | 'grid' | 'paper';

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
}
