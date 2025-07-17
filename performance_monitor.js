export class PerformanceMonitor {
    constructor() {
        this.metrics = {
            startTime: Date.now(),
            requests: {
                total: 0,
                successful: 0,
                failed: 0,
                cached: 0
            },
            api: {
                calls: 0,
                totalLatency: 0,
                errors: 0,
                rateLimitHits: 0
            },
            memory: {
                heapUsed: 0,
                heapTotal: 0,
                external: 0
            },
            chat: {
                messagesProcessed: 0,
                commandsExecuted: 0,
                uniqueUsers: new Set()
            }
        };
        
        // Start monitoring intervals
        this.startMonitoring();
    }

    startMonitoring() {
        // Update memory stats every 30 seconds
        setInterval(() => {
            this.updateMemoryStats();
        }, 30000);

        // Log performance summary every 5 minutes
        setInterval(() => {
            this.logPerformanceSummary();
        }, 300000);
    }

    updateMemoryStats() {
        const memUsage = process.memoryUsage();
        this.metrics.memory = {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
            external: Math.round(memUsage.external / 1024 / 1024) // MB
        };
    }

    recordRequest(success = true, cached = false) {
        this.metrics.requests.total++;
        if (success) {
            this.metrics.requests.successful++;
        } else {
            this.metrics.requests.failed++;
        }
        if (cached) {
            this.metrics.requests.cached++;
        }
    }

    recordApiCall(latency, success = true) {
        this.metrics.api.calls++;
        this.metrics.api.totalLatency += latency;
        if (!success) {
            this.metrics.api.errors++;
        }
    }

    recordRateLimitHit() {
        this.metrics.api.rateLimitHits++;
    }

    recordMessage(username) {
        this.metrics.chat.messagesProcessed++;
        this.metrics.chat.uniqueUsers.add(username);
    }

    recordCommand() {
        this.metrics.chat.commandsExecuted++;
    }

    getStats() {
        const uptime = Date.now() - this.metrics.startTime;
        const avgApiLatency = this.metrics.api.calls > 0 ? 
            this.metrics.api.totalLatency / this.metrics.api.calls : 0;

        return {
            uptime: Math.round(uptime / 1000), // seconds
            requests: {
                ...this.metrics.requests,
                successRate: this.metrics.requests.total > 0 ? 
                    (this.metrics.requests.successful / this.metrics.requests.total * 100).toFixed(2) + '%' : '0%',
                cacheHitRate: this.metrics.requests.total > 0 ? 
                    (this.metrics.requests.cached / this.metrics.requests.total * 100).toFixed(2) + '%' : '0%'
            },
            api: {
                ...this.metrics.api,
                averageLatency: Math.round(avgApiLatency) + 'ms',
                errorRate: this.metrics.api.calls > 0 ? 
                    (this.metrics.api.errors / this.metrics.api.calls * 100).toFixed(2) + '%' : '0%'
            },
            memory: this.metrics.memory,
            chat: {
                ...this.metrics.chat,
                uniqueUsers: this.metrics.chat.uniqueUsers.size
            }
        };
    }

    logPerformanceSummary() {
        const stats = this.getStats();
        console.log('=== Performance Summary ===');
        console.log(`Uptime: ${Math.floor(stats.uptime / 3600)}h ${Math.floor((stats.uptime % 3600) / 60)}m`);
        console.log(`Requests: ${stats.requests.total} (${stats.requests.successRate} success, ${stats.requests.cacheHitRate} cached)`);
        console.log(`API Calls: ${stats.api.calls} (${stats.api.averageLatency} avg, ${stats.api.errorRate} errors)`);
        console.log(`Memory: ${stats.memory.heapUsed}MB heap, ${stats.memory.external}MB external`);
        console.log(`Chat: ${stats.chat.messagesProcessed} messages, ${stats.chat.uniqueUsers} unique users`);
        console.log('========================');
    }

    reset() {
        this.metrics = {
            startTime: Date.now(),
            requests: { total: 0, successful: 0, failed: 0, cached: 0 },
            api: { calls: 0, totalLatency: 0, errors: 0, rateLimitHits: 0 },
            memory: { heapUsed: 0, heapTotal: 0, external: 0 },
            chat: { messagesProcessed: 0, commandsExecuted: 0, uniqueUsers: new Set() }
        };
    }
}