import runtime from '../src/backend/runtime/worker.js';
import { createCandidateApplicationGateway } from '../src/backend/providers/candidate-application-gateway.js';

export default {
  fetch: runtime.fetch,
  scheduled(_controller, env, ctx) {
    const gateway = createCandidateApplicationGateway({ env, runtime: 'cloudflare-workers' });
    ctx.waitUntil(gateway.cleanupExpired({ limit: 25 }));
  }
};
