
const SIZE = 99999;

export class IdGenRoundCounter {
  num: number;
  constructor() {
    this.num = Math.round(Math.random() * SIZE);
  }

  take(): number {
    if (this.num === SIZE) {
      this.num = 0;
    }
    return ++this.num;
  }
}
