import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const traceExporter = new OTLPTraceExporter({
  // ส่งไปที่ OpenTelemetry Collector
  url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://otel-collector:4318/v1/traces'
});

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'express-api',
    [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'demo',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0'
  }),
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      // เปิด http/express auto-instrumentation
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true }
    })
  ]
});

sdk.start();
