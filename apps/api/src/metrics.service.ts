import { Injectable, Logger } from '@nestjs/common';

interface MetricValue {
  value: number;
  timestamp: number;
}

interface MetricData {
  count: number;
  sum: number;
  min: number;
  max: number;
  samples: MetricValue[];
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private metrics: Map<string, MetricData> = new Map();
  private readonly maxSamples = 1000;

  // API availability tracking
  incrementCounter(name: string, tags: Record<string, string> = {}) {
    const key = this.getMetricKey(name, tags);
    const metric = this.getOrCreateMetric(key);
    metric.count++;
    this.addSample(key, 1);
  }

  // Duration tracking (Fabric commit, payout duration, etc.)
  recordDuration(name: string, durationMs: number, tags: Record<string, string> = {}) {
    const key = this.getMetricKey(name, tags);
    const metric = this.getOrCreateMetric(key);
    metric.count++;
    metric.sum += durationMs;
    metric.min = Math.min(metric.min, durationMs);
    metric.max = Math.max(metric.max, durationMs);
    this.addSample(key, durationMs);
  }

  // Gauge tracking (projection lag, queue size, etc.)
  recordGauge(name: string, value: number, tags: Record<string, string> = {}) {
    const key = this.getMetricKey(name, tags);
    const metric = this.getOrCreateMetric(key);
    metric.count++;
    metric.sum += value;
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);
    this.addSample(key, value);
  }

  // Error tracking
  recordError(name: string, error: Error, tags: Record<string, string> = {}) {
    const key = this.getMetricKey(name, tags);
    const metric = this.getOrCreateMetric(key);
    metric.count++;
    this.addSample(key, 1);
  }

  private getMetricKey(name: string, tags: Record<string, string>): string {
    const tagString = Object.entries(tags)
      .map(([k, v]) => `${k}=${v}`)
      .sort()
      .join(',');
    return tagString ? `${name}{${tagString}}` : name;
  }

  private getOrCreateMetric(key: string): MetricData {
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        count: 0,
        sum: 0,
        min: Infinity,
        max: -Infinity,
        samples: []
      });
    }
    return this.metrics.get(key)!;
  }

  private addSample(key: string, value: number) {
    const metric = this.metrics.get(key);
    if (!metric) return;

    metric.samples.push({
      value,
      timestamp: Date.now()
    });

    // Keep only recent samples
    if (metric.samples.length > this.maxSamples) {
      metric.samples.shift();
    }
  }

  getMetric(name: string, tags: Record<string, string> = {}) {
    const key = this.getMetricKey(name, tags);
    const metric = this.metrics.get(key);
    
    if (!metric) {
      return null;
    }

    const avg = metric.count > 0 ? metric.sum / metric.count : 0;
    
    return {
      name,
      tags,
      count: metric.count,
      sum: metric.sum,
      avg,
      min: metric.min === Infinity ? 0 : metric.min,
      max: metric.max === -Infinity ? 0 : metric.max,
      samples: metric.samples
    };
  }

  getAllMetrics() {
    const result: any[] = [];
    
    for (const [key, metric] of this.metrics.entries()) {
      const avg = metric.count > 0 ? metric.sum / metric.count : 0;
      
      // Parse key to extract name and tags
      const match = key.match(/^([^{]+)(?:{(.+)})?$/);
      if (match) {
        const [, name, tagString] = match;
        const tags: Record<string, string> = {};
        
        if (tagString) {
          tagString.split(',').forEach(tag => {
            const [k, v] = tag.split('=');
            tags[k] = v;
          });
        }
        
        result.push({
          name,
          tags,
          count: metric.count,
          sum: metric.sum,
          avg,
          min: metric.min === Infinity ? 0 : metric.min,
          max: metric.max === -Infinity ? 0 : metric.max
        });
      }
    }
    
    return result;
  }

  reset() {
    this.metrics.clear();
  }

  // Specific metrics for ReliefChain
  recordApiRequest(method: string, path: string, statusCode: number, durationMs: number) {
    this.incrementCounter('api.requests', { method, path, status: statusCode.toString() });
    this.recordDuration('api.duration', durationMs, { method, path });
    
    if (statusCode >= 500) {
      this.recordError('api.errors', new Error(`HTTP ${statusCode}`), { method, path, status: statusCode.toString() });
    }
  }

  recordFabricTransaction(transactionType: string, durationMs: number, success: boolean) {
    this.recordDuration('fabric.commit_duration', durationMs, { type: transactionType });
    this.incrementCounter('fabric.transactions', { type: transactionType, success: success.toString() });
    
    if (!success) {
      this.recordError('fabric.errors', new Error('Transaction failed'), { type: transactionType });
    }
  }

  recordPayoutAttempt(status: string, durationMs: number) {
    this.recordDuration('payout.duration', durationMs, { status });
    this.incrementCounter('payout.attempts', { status });
    
    if (status === 'FAILED') {
      this.recordError('payout.errors', new Error('Payout failed'), { status });
    }
  }

  recordProjectionLag(lag: number) {
    this.recordGauge('projection.lag', lag);
  }

  recordQueueSize(queueName: string, size: number) {
    this.recordGauge('queue.size', size, { queue: queueName });
  }

  recordQueueFailure(queueName: string, error: Error) {
    this.recordError('queue.failures', error, { queue: queueName });
  }

  recordReconciliationDiscrepancy(discrepancyType: string, amount: number) {
    this.recordGauge('reconciliation.discrepancy', amount, { type: discrepancyType });
    this.recordError('reconciliation.discrepancies', new Error('Reconciliation mismatch'), { type: discrepancyType });
  }

  getSystemHealth() {
    const allMetrics = this.getAllMetrics();
    
    // Calculate key health indicators
    const apiMetrics = allMetrics.filter(m => m.name.startsWith('api.'));
    const fabricMetrics = allMetrics.filter(m => m.name.startsWith('fabric.'));
    const payoutMetrics = allMetrics.filter(m => m.name.startsWith('payout.'));
    const projectionMetrics = allMetrics.filter(m => m.name.startsWith('projection.'));
    const queueMetrics = allMetrics.filter(m => m.name.startsWith('queue.'));
    const reconciliationMetrics = allMetrics.filter(m => m.name.startsWith('reconciliation.'));

    return {
      api: {
        totalRequests: apiMetrics.reduce((sum, m) => sum + m.count, 0),
        avgDuration: this.calculateAvg(apiMetrics.filter(m => m.name === 'api.duration')),
        errorRate: this.calculateErrorRate(apiMetrics.filter(m => m.name === 'api.errors'))
      },
      fabric: {
        totalTransactions: fabricMetrics.reduce((sum, m) => sum + m.count, 0),
        avgCommitDuration: this.calculateAvg(fabricMetrics.filter(m => m.name === 'fabric.commit_duration')),
        successRate: this.calculateSuccessRate(fabricMetrics.filter(m => m.name === 'fabric.transactions'))
      },
      payout: {
        totalAttempts: payoutMetrics.reduce((sum, m) => sum + m.count, 0),
        avgDuration: this.calculateAvg(payoutMetrics.filter(m => m.name === 'payout.duration')),
        failureRate: this.calculateErrorRate(payoutMetrics.filter(m => m.name === 'payout.errors'))
      },
      projection: {
        currentLag: this.getLatestGauge(projectionMetrics.filter(m => m.name === 'projection.lag'))
      },
      queue: {
        totalFailures: queueMetrics.reduce((sum, m) => sum + m.count, 0),
        sizes: queueMetrics.filter(m => m.name === 'queue.size')
      },
      reconciliation: {
        totalDiscrepancies: reconciliationMetrics.reduce((sum, m) => sum + m.count, 0),
        totalAmount: reconciliationMetrics.reduce((sum, m) => sum + m.sum, 0)
      }
    };
  }

  private calculateAvg(metrics: any[]): number {
    if (metrics.length === 0) return 0;
    const totalSum = metrics.reduce((sum, m) => sum + m.sum, 0);
    const totalCount = metrics.reduce((sum, m) => sum + m.count, 0);
    return totalCount > 0 ? totalSum / totalCount : 0;
  }

  private calculateErrorRate(errorMetrics: any[]): number {
    if (errorMetrics.length === 0) return 0;
    const totalErrors = errorMetrics.reduce((sum, m) => sum + m.count, 0);
    const totalRequests = this.metrics.get('api.requests')?.count || 0;
    return totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
  }

  private calculateSuccessRate(transactionMetrics: any[]): number {
    const successCount = transactionMetrics
      .filter(m => m.tags.success === 'true')
      .reduce((sum, m) => sum + m.count, 0);
    const totalCount = transactionMetrics.reduce((sum, m) => sum + m.count, 0);
    return totalCount > 0 ? (successCount / totalCount) * 100 : 0;
  }

  private getLatestGauge(gaugeMetrics: any[]): number {
    if (gaugeMetrics.length === 0) return 0;
    return gaugeMetrics[0].max; // Use max as latest gauge value
  }
}
