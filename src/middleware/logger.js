const crypto = require('crypto');

function structuredLogger(req, res, next) {
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    req.id = requestId;
    res.setHeader('X-Request-Id', requestId);

    const startTime = process.hrtime.bigint();

    res.on('finish', () => {
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1e6;

        const logEntry = {
            timestamp: new Date().toISOString(),
            requestId,
            method: req.method,
            path: req.originalUrl || req.url,
            status: res.statusCode,
            durationMs: durationMs.toFixed(2),
            ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            userId: req.session?.user?.id || req.user?.id || null
        };

        if (res.statusCode >= 500) {
            console.error('[HTTP 5XX ERROR]', JSON.stringify(logEntry));
        } else if (res.statusCode >= 400) {
            console.warn('[HTTP 4XX WARN]', JSON.stringify(logEntry));
        } else {
            console.log('[HTTP INFO]', JSON.stringify(logEntry));
        }
    });

    next();
}

module.exports = structuredLogger;
