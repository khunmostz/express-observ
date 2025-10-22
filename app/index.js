import express from 'express';
import pino from 'pino';
import client from 'prom-client';

const app = express();
const logger = pino(); // stdout -> promtail จะเก็บไปที่ Loki

// ----- Metrics (Prometheus) -----
const register = new client.Registry();
client.collectDefaultMetrics({ register }); // CPU, mem, GC ฯลฯ

// Custom metric: request histogram
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.6, 1, 3, 5]
});
register.registerMetric(httpRequestDuration);

// Middleware จับเวลา + log
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const diff = Number(process.hrtime.bigint() - start) / 1e9;

    // ⬇️ ดึง context ปัจจุบันจาก OpenTelemetry
    const span = trace.getSpan(context.active());
    const sc = span?.spanContext();
    const trace_id = sc?.traceId; // 32 hex
    const span_id  = sc?.spanId;  // 16 hex

    // metric
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, String(res.statusCode))
      .observe(diff);

    // log + trace fields
    logger.info({
      msg: 'request_completed',
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration_s: diff,
      trace_id,   // ✅ สำคัญ
      span_id     // (ช่วยเวลา drill-down)
    });
  });
  next();
});

// ----- Routes -----
app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/hello', (req, res) => {
  res.json({ message: 'Hello Observability 👋' });
});

app.get('/work', async (req, res) => {
  // งานจำลองช้า ๆ
  await new Promise(r => setTimeout(r, 200 + Math.random() * 800));
  res.json({ done: true });
});

// Endpoint metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/boom', (_req, res) => res.status(500).json({ error: 'boom' }));

const port = process.env.PORT || 3000;
app.listen(port, () => logger.info({ msg: `API listening on ${port}` }));
