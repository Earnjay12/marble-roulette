import type { SkillMode } from './data/constants';

export type WinnerRange = { start: number; end: number };

class Options {
  skillMode: SkillMode = 'basic';
  /** 0-based, 양끝 포함. 1명 추첨은 start === end */
  winnerRange: WinnerRange = { start: 0, end: 0 };
  autoRecording: boolean = true;

  /** 예전 boolean 옵션과의 호환. 스킬이 하나라도 켜져 있으면 true */
  get useSkills(): boolean {
    return this.skillMode !== 'none';
  }

  set useSkills(value: boolean) {
    this.skillMode = value ? 'basic' : 'none';
  }
}

const options = new Options();
export default options;
