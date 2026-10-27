/**
 * Host half of dsh-deepseek-webchat-claude-skin.
 *
 * The skin is browser-only: it lives in the DSH web surface and pushes CSS into
 * the embedded DeepSeek guest through the webview element. Every profile row
 * needs a Node-side module, and a no-op is legitimate, so this file exists only
 * to satisfy the loader.
 */

/** @type {string[]} No Cordis services are required. */
export const inject = [];

/**
 * Host plugin body.
 * @param ctx - Cordis context (unused).
 */
export function apply(ctx) {}
