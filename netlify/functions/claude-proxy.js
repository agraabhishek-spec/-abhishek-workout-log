// Netlify Function: securely proxies requests to Anthropic's API.
// Uses Node's built-in https module (not fetch) for maximum compatibility
// across all Netlify Function runtime versions.
// Your ANTHROPIC_API_KEY is read from a Netlify environment variable --
// it never gets exposed to the browser or anyone visiting your site.

const https = require("https");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "ANTHROPIC_API_KEY is not set. Add it in Netlify -> Site configuration -> Environment variables, then redeploy.",
      }),
    };
  }

  return new Promise((resolve) => {
    try {
      const bodyStr = event.body || "{}";

      const req = https.request(
        {
          hostname: "api.anthropic.com",
          path: "/v1/messages",
          method: "POST",
          headers: {
            "content-type": "application/json",
            "content-length": Buffer.byteLength(bodyStr),
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => { data += chunk; });
          res.on("end", () => {
            resolve({
              statusCode: res.statusCode || 500,
              headers: { "content-type": "application/json" },
              body: data || JSON.stringify({ error: "Empty response from Anthropic API" }),
            });
          });
        }
      );

      req.on("error", (err) => {
        resolve({
          statusCode: 500,
          body: JSON.stringify({ error: "Request to Anthropic failed: " + (err && err.message ? err.message : String(err)) }),
        });
      });

      req.write(bodyStr);
      req.end();
    } catch (err) {
      resolve({
        statusCode: 500,
        body: JSON.stringify({ error: "Function crashed: " + (err && err.message ? err.message : String(err)) }),
      });
    }
  });
};
