import { routeNeedsJsonBody } from '../src/backend/api/router.js';
import { createBackendApplication } from '../src/backend/application.js';
import { noopLogger } from '../src/backend/core/logger.js';
import { assertJsonContentType, readBoundedRequestText } from '../src/backend/core/payload.js';
import { createProviderRegistry } from '../src/backend/providers/provider-registry.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const validContact = {
  firstName: 'Test',
  lastName: 'User',
  company: 'RC QA',
  jobTitle: 'Tester',
  email: 'qa@example.com',
  phone: '+44 7700 900000',
  consultationTopic: 'IT Consultancy',
  message: 'Backend foundation test',
  privacyConsent: true
};

assert(routeNeedsJsonBody('/api/contact', 'POST') === true, 'POST contact should require JSON parsing');
assert(routeNeedsJsonBody('/api/contact', 'GET') === false, 'disallowed GET contact must reach the 405 gate before body parsing');
assert(routeNeedsJsonBody('/api/contact/anything', 'POST') === false, 'invalid suffix routes must not trigger body parsing');
assertJsonContentType({ 'content-type': 'application/json; charset=utf-8' });
assertJsonContentType({ 'content-type': 'application/vnd.rcitservices+json' });
let mediaTypeRejected = false;
try {
  assertJsonContentType({ 'content-type': 'text/plain' });
} catch (error) {
  mediaTypeRejected = error?.status === 415 && error?.code === 'UNSUPPORTED_MEDIA_TYPE';
}
assert(mediaTypeRejected, 'non-JSON request bodies must be rejected with 415');

const unconfigured = createBackendApplication({ runtime: 'test', env: { NODE_ENV: 'test' }, logger: noopLogger });
let result = await unconfigured.handle({ method: 'GET', pathname: '/api/health', headers: {} });
assert(result.status === 200 && result.body.ok === true, 'health should return 200');
assert(result.body.data.runtime === 'test', 'health should identify runtime');
assert(Boolean(result.body.requestId), 'health should include request id');
assert(result.headers['x-request-id'] === result.body.requestId, 'health request id header/body must match');

result = await unconfigured.handle({ method: 'POST', pathname: '/api/contact', headers: {}, body: validContact });
assert(result.status === 503, `unconfigured contact should return 503, got ${result.status}`);
assert(result.body.code === 'PERSISTENCE_NOT_CONFIGURED', 'unconfigured persistence must have explicit code');
assert(result.body.ok === false, 'unconfigured persistence must never report success');

result = await unconfigured.handle({ method: 'POST', pathname: '/api/contact', headers: {}, body: { firstName: 'Only' } });
assert(result.status === 422 && result.body.code === 'VALIDATION_ERROR', 'invalid contact must be 422');

result = await unconfigured.handle({ method: 'POST', pathname: '/api/contact', headers: {}, body: { ...validContact, firstName: 'x'.repeat(81) } });
assert(result.status === 422 && result.body.code === 'VALIDATION_ERROR', 'over-length fields must be rejected rather than truncated');
assert(result.body.details?.maxLength === 80, 'over-length validation should expose the enforced limit');

result = await unconfigured.handle({ method: 'GET', pathname: '/api/contact', headers: {} });
assert(result.status === 405, 'wrong method must be 405');
assert(result.headers.allow === 'POST', '405 must advertise allowed method');

result = await unconfigured.handle({ method: 'POST', pathname: '/api/contact/anything', headers: {}, body: validContact });
assert(result.status === 404 && result.body.code === 'NOT_FOUND', 'API routes must reject unexpected extra path segments');

result = await unconfigured.handle({ method: 'GET', pathname: '/api/unknown', headers: {} });
assert(result.status === 404 && result.body.code === 'NOT_FOUND', 'unknown API route must be 404');

result = await unconfigured.handle({ method: 'POST', pathname: '/api/login', headers: {} });
assert(result.status === 501 && result.body.code === 'AUTH_NOT_CONFIGURED', 'login boundary must stay explicit');

result = await unconfigured.handle({ method: 'POST', pathname: '/api/resume', headers: {} });
assert(result.status === 501 && result.body.code === 'RECRUITMENT_STORAGE_NOT_CONFIGURED', 'resume boundary must stay explicit');

const oversizedRequest = new Request('https://example.test/api/contact', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ message: 'x'.repeat(128) })
});
let oversizedRejected = false;
try {
  await readBoundedRequestText(oversizedRequest, 32);
} catch (error) {
  oversizedRejected = error?.status === 413 && error?.code === 'PAYLOAD_TOO_LARGE';
}
assert(oversizedRejected, 'streaming request reader must stop oversized bodies with 413');

const records = [];
const repository = {
  configured: true,
  name: 'test-memory-repository',
  async create(record) {
    records.push(record);
    return { id: record.id };
  }
};
const configured = createBackendApplication({ runtime: 'test', env: { NODE_ENV: 'test' }, submissionRepository: repository, logger: noopLogger });
result = await configured.handle({ method: 'POST', pathname: '/api/contact', headers: { 'x-request-id': 'phase7-test-request' }, body: validContact });
assert(result.status === 201 && result.body.ok === true, 'configured persistence should return 201');
assert(records.length === 1, 'configured repository should receive exactly one record');
assert(records[0].type === 'contact', 'persisted record should retain submission type');
assert(records[0].requestId === 'phase7-test-request', 'persisted record should retain request id');
assert(records[0].payload.email === validContact.email, 'canonical contact validation should preserve email');
assert(Object.isFrozen(records[0].payload), 'validated payload should be immutable when handed to persistence');
assert(result.body.data.id === records[0].id, 'response id must be persisted record id');

const failingRepository = {
  configured: true,
  async create() { throw new Error('database unavailable'); }
};
const failing = createBackendApplication({ runtime: 'test', submissionRepository: failingRepository, logger: noopLogger });
result = await failing.handle({ method: 'POST', pathname: '/api/contact', headers: {}, body: validContact });
assert(result.status === 500 && result.body.ok === false, 'repository failure must not be converted into success');
assert(result.body.code === 'INTERNAL_ERROR', 'unexpected repository failure should be normalized');

const providers = createProviderRegistry();
assert(providers.database.configured === false, 'database provider should default unconfigured');
assert(providers.storage.configured === false, 'storage provider should default unconfigured');
assert(providers.email.configured === false, 'email provider should default unconfigured');

console.log('PASS: Phase 7 backend layering, exact API routing, method-aware parsing, bounded streaming input, JSON media-type enforcement, strict validation, status/error envelope, request IDs, provider boundaries and no-fake-success persistence contract verified.');
