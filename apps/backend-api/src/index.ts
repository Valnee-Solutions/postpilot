import Fastify from 'fastify'
import {
  getMissingRuntimeSecrets,
  loadEnvironment,
} from './config/environment.js'
import { registerSensible } from './plugins/sensible.js'
import { registerCors } from './plugins/cors.js'
import { registerSecurityHeaders } from './plugins/securityHeaders.js'
import { registerAiRoutes } from './routes/v1/ai/aiHandler.js'
import { registerBillingRoutes } from './routes/v1/billing/billingHandler.js'
import { registerWebhookRoutes } from './routes/v1/billing/webhookHandler.js'

const env = loadEnvironment()
const missingSecrets = getMissingRuntimeSecrets(env)

const app = Fastify({
  logger: true,
  bodyLimit: 1024 * 1024,
})

app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
  req.rawBody = body as Buffer
  try {
    const json = JSON.parse((body as Buffer).toString('utf8'))
    done(null, json)
  } catch (error) {
    done(error as Error, undefined)
  }
})

await registerSensible(app)
await registerCors(app, env)
await registerSecurityHeaders(app)

app.get('/health', async () => ({
  status: 'ok',
  configured: missingSecrets.length === 0,
  missing: missingSecrets,
}))

if (missingSecrets.length > 0) {
  app.log.warn(
    { missingSecrets },
    'Server starting without required secrets. /health will work, API routes will fail until secrets are attached in Cloud Run.',
  )
}

await registerAiRoutes(app, env)
await registerBillingRoutes(app, env)
await registerWebhookRoutes(app, env)

try {
  // Cloud Run requires listening on 0.0.0.0:$PORT
  await app.listen({ port: env.API_PORT, host: env.API_HOST })
  app.log.info(`API listening on ${env.API_HOST}:${env.API_PORT}`)
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
