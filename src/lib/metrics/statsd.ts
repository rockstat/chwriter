import * as StatsdClient from 'statsd-client'
import { Configurer } from '@app/lib';
import { Deps } from '@app/AppServer';

interface MetricsCollector {
  tick(metric: string): void;
  timenote(metric: string): () => number;
  time(metric: string, time: number): void;
}

export class StatsDMetrics implements MetricsCollector {

  client: StatsdClient;

  constructor({ config }: Deps) {
    const cfg = config.get('metrics').statsd;
    if (cfg) {
      this.client = new StatsdClient(cfg)
    } else {
      throw new Error('Statsd not configured');
    }
  }

  tick(metric: string, tags?: { [k: string]: string | number }) {
    this.client.increment(metric, undefined, tags);
  }

  timenote(metric: string, tags?: { [k: string]: string | number }): () => number {
    const start = process.hrtime();
    return () => {
      const diff = process.hrtime(start);
      const time = Math.round(diff[0] * 1e3 + diff[1] * 1e-6);
      this.time(metric, time);
      return time;
    }
  }

  time(metric: string, duration: number, tags?: { [k: string]: string | number }): void {
    this.client.timing(metric, duration, tags);
  }

}

