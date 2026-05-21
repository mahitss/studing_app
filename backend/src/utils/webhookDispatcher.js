const Webhook = require("../models/Webhook");
const logger = require("./logger");
const http = require("http");
const https = require("https");
const { URL } = require("url");

const dispatchWebhook = async (userId, event, payload) => {
  try {
    const webhooks = await Webhook.find({ userId, events: event, isActive: true });
    if (!webhooks.length) return;

    const data = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      payload
    });

    for (const hook of webhooks) {
      try {
        const urlObj = new URL(hook.url);
        const requestModule = urlObj.protocol === "https:" ? https : http;

        const options = {
          hostname: urlObj.hostname,
          port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(data),
            "User-Agent": "Study-Tracker-Webhook-Agent"
          },
          timeout: 5000
        };

        const req = requestModule.request(options, (res) => {
          logger.info(`[Webhook] Dispatched to ${hook.url}. Response Status: ${res.statusCode}`);
        });

        req.on("error", (err) => {
          logger.error(`[Webhook] Dispatch failed for URL ${hook.url}: ${err.message}`);
        });

        req.on("timeout", () => {
          req.destroy();
          logger.error(`[Webhook] Timeout (5s) occurred dispatching to ${hook.url}`);
        });

        req.write(data);
        req.end();
      } catch (err) {
        logger.error(`[Webhook] Failed to dispatch individual webhook: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error(`[Webhook] Central dispatcher error: ${err.message}`);
  }
};

module.exports = { dispatchWebhook };
