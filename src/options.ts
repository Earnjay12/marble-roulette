import type { SkillMode, SkillPack } from './data/constants';

export type WinnerRange = { start: number; end: number };

class Options {
  skillMode: SkillMode = 'basic';
  /** 능력·모노전투에서 쓸 스킬 팩 */
  skillPack: SkillPack = 'general';
  /** 현재 테마 이름(constants.Themes의 키). 스킬 이름·아이콘 색이 테마를 따라간다 */
  themeName: string = 'dark';
  /** 0-based, 양끝 포함. 1명 추첨은 start === end */
  winnerRange: WinnerRange = { start: 0, end: 0 };
  autoRecording: boolean = true;

  /** 구슬마다 고유 능력이 있는 모드(능력·모노전투) */
  get abilityMode(): boolean {
    return this.skillMode === 'rpg' || this.skillMode === 'mono';
  }

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
