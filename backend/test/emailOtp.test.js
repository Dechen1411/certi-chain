const test = require("node:test");
const assert = require("node:assert/strict");

const { createSignupOtpSender } = require("../emailOtp");

const withMockFetch = async (handler, run) => {
  const originalFetch = global.fetch;
  global.fetch = handler;

  try {
    await run();
  } finally {
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      delete global.fetch;
    }
  }
};

test("OTP sender can deliver through Brevo email API", async () => {
  const calls = [];

  await withMockFetch(
    async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 201,
        statusText: "Created",
        text: async () => "",
      };
    },
    async () => {
      const sendOtp = createSignupOtpSender({
        appName: "CertiChain",
        from: "CertiChain <sender@example.com>",
        emailApiProvider: "brevo",
        emailApiKey: "brevo-test-key",
      });

      const result = await sendOtp({
        email: "student@rub.edu.bt",
        name: "Student User",
        otp: "123456",
        expiresInMinutes: 10,
      });

      assert.deepEqual(result, { delivered: true });
    },
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.brevo.com/v3/smtp/email");
  assert.equal(calls[0].options.headers["api-key"], "brevo-test-key");

  const body = JSON.parse(calls[0].options.body);
  assert.deepEqual(body.sender, { email: "sender@example.com", name: "CertiChain" });
  assert.deepEqual(body.to, [{ email: "student@rub.edu.bt" }]);
  assert.equal(body.subject, "CertiChain verification code");
  assert.match(body.textContent, /123456/);
  assert.match(body.htmlContent, /123456/);
});

test("OTP sender can deliver through Resend email API", async () => {
  const calls = [];

  await withMockFetch(
    async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => "",
      };
    },
    async () => {
      const sendOtp = createSignupOtpSender({
        appName: "CertiChain",
        from: "CertiChain <sender@example.com>",
        emailApiProvider: "resend",
        emailApiKey: "resend-test-key",
      });

      await sendOtp({
        email: "student@rub.edu.bt",
        name: "Student User",
        otp: "654321",
        expiresInMinutes: 10,
      });
    },
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.resend.com/emails");
  assert.equal(calls[0].options.headers.authorization, "Bearer resend-test-key");

  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.from, "CertiChain <sender@example.com>");
  assert.deepEqual(body.to, ["student@rub.edu.bt"]);
  assert.equal(body.subject, "CertiChain verification code");
  assert.match(body.text, /654321/);
  assert.match(body.html, /654321/);
});

test("OTP sender reports email API delivery failures", async () => {
  await withMockFetch(
    async () => ({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () => "invalid api key",
    }),
    async () => {
      const sendOtp = createSignupOtpSender({
        appName: "CertiChain",
        from: "CertiChain <sender@example.com>",
        emailApiProvider: "brevo",
        emailApiKey: "bad-key",
      });

      await assert.rejects(
        sendOtp({
          email: "student@rub.edu.bt",
          name: "Student User",
          otp: "123456",
          expiresInMinutes: 10,
        }),
        /Brevo email API failed \(401\): invalid api key/,
      );
    },
  );
});
