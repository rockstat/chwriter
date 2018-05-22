import { IdGenShowFlake } from './snow_flake';
import { IdGenRoundCounter } from './round_counter';

export class IdService {

  sf: IdGenShowFlake;

  rpcCounter: IdGenRoundCounter = new IdGenRoundCounter();

  eventId(): string {
    return this.sf.take();
  }

  userId(): string {
    return this.sf.take();
  }

  rpcId(): string {
    return this.rpcCounter.take().toString(36);
  }

}
