// Keep this entrypoint inside the dedicated Cloudflare Builds root so changes to
// the production-admin deployment surface trigger its monorepo watch path.
// Runtime authority remains in worker/admin-only.js and is imported from the
// exact mirrored main commit that Cloudflare builds.
import adminWorker from '../../worker/admin-only.js';

export default adminWorker;
