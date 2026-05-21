const dns = require("dns");
const net = require("net");
const tls = require("tls");
const nodemailer = require("nodemailer");

try {
  if (typeof dns.setDefaultResultOrder === "function") {
    dns.setDefaultResultOrder("ipv4first");
  }
} catch {
  // SMTP_FAMILY still controls the transport socket below.
}

const isSmtpConfigured = ({ host, user, pass }) => {
  return Boolean(host && user && pass);
};

const parseSmtpFamily = (family) => {
  const value = Number(family);
  return value === 4 || value === 6 ? value : undefined;
};

const parseTimeout = (value, fallback) => {
  const timeout = Number(value);
  return Number.isFinite(timeout) && timeout > 0 ? timeout : fallback;
};

const resolveIpv4Address = (host, timeout) => {
  return new Promise((resolve, reject) => {
    const ipVersion = net.isIP(host);

    if (ipVersion === 4) {
      resolve(host);
      return;
    }

    if (ipVersion === 6) {
      reject(new Error("SMTP_FAMILY=4 cannot connect to an IPv6 SMTP host"));
      return;
    }

    let settled = false;
    const finish = (error, address) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);

      if (error) {
        reject(error);
        return;
      }

      resolve(address);
    };

    const timer = setTimeout(() => {
      finish(new Error(`Timed out resolving IPv4 SMTP host ${host}`));
    }, timeout);

    dns.resolve4(host, (resolveError, addresses) => {
      if (addresses && addresses.length) {
        finish(null, addresses[0]);
        return;
      }

      dns.lookup(host, { family: 4 }, (lookupError, address) => {
        finish(lookupError || resolveError || new Error(`No IPv4 address found for SMTP host ${host}`), address);
      });
    });
  });
};

const createIpv4SocketFactory = ({ host, port, timeout }) => {
  return async (options, callback) => {
    const smtpHost = options.host || host;
    const smtpPort = Number(options.port || port || 587);
    const secureConnection = Boolean(options.secure);
    const servername = options.servername || smtpHost;

    let address;
    try {
      address = await resolveIpv4Address(smtpHost, timeout);
    } catch (error) {
      callback(error);
      return;
    }

    let socket;
    let settled = false;

    const cleanup = () => {
      if (!socket) {
        return;
      }

      socket.removeListener("error", onError);
      socket.removeListener("timeout", onTimeout);
    };

    const finish = (error, socketOptions) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();

      if (error) {
        socket?.destroy();
        callback(error);
        return;
      }

      callback(null, socketOptions);
    };

    const onError = (error) => finish(error);
    const onTimeout = () => finish(new Error(`Timed out connecting to IPv4 SMTP host ${smtpHost}:${smtpPort}`));
    const onReady = () => {
      socket.setKeepAlive(true);
      finish(null, {
        connection: socket,
        host: smtpHost,
        servername,
        ...(secureConnection ? { secured: true } : {}),
      });
    };

    try {
      if (secureConnection) {
        socket = tls.connect(
          {
            ...(options.tls || {}),
            host: address,
            port: smtpPort,
            servername,
          },
          onReady,
        );
      } else {
        socket = net.connect(
          {
            host: address,
            port: smtpPort,
            localAddress: options.localAddress,
          },
          onReady,
        );
      }
    } catch (error) {
      callback(error);
      return;
    }

    socket.setTimeout(timeout);
    socket.once("error", onError);
    socket.once("timeout", onTimeout);
  };
};

const createSignupOtpSender = ({
  appName = "CertiChain",
  from,
  host,
  port,
  secure,
  family,
  connectionTimeout,
  greetingTimeout,
  socketTimeout,
  user,
  pass,
  allowPreview,
}) => {
  const configured = isSmtpConfigured({ host, user, pass });
  const smtpFamily = parseSmtpFamily(family);
  const smtpConnectionTimeout = parseTimeout(connectionTimeout, 10_000);
  const smtpGreetingTimeout = parseTimeout(greetingTimeout, 10_000);
  const smtpSocketTimeout = parseTimeout(socketTimeout, 20_000);
  const smtpPort = Number(port || 587);
  const transportOptions = {
    host,
    port: smtpPort,
    secure: Boolean(secure),
    family: smtpFamily,
    dnsTimeout: smtpConnectionTimeout,
    connectionTimeout: smtpConnectionTimeout,
    greetingTimeout: smtpGreetingTimeout,
    socketTimeout: smtpSocketTimeout,
    tls: host ? { servername: host } : undefined,
    auth: { user, pass },
  };

  if (smtpFamily === 4) {
    transportOptions.getSocket = createIpv4SocketFactory({
      host,
      port: smtpPort,
      timeout: smtpConnectionTimeout,
    });
  }

  const transporter = configured
    ? nodemailer.createTransport(transportOptions)
    : null;

  return async ({
    email,
    name,
    otp,
    expiresInMinutes,
    subject,
    intro,
    ignoreText,
  }) => {
    if (!transporter) {
      if (allowPreview) {
        return { delivered: false, previewOtp: otp };
      }

      throw new Error("Email verification is not configured");
    }

    const emailSubject = subject || `${appName} verification code`;
    const introText = intro || `Your ${appName} verification code is`;
    const fallbackIgnoreText = ignoreText || "If you did not request this account, you can ignore this email.";

    await transporter.sendMail({
      from: from || `${appName} <${user}>`,
      to: email,
      subject: emailSubject,
      text: [
        `Hi ${name || "there"},`,
        "",
        `${introText} ${otp}.`,
        `It expires in ${expiresInMinutes} minutes.`,
        "",
        fallbackIgnoreText,
      ].join("\n"),
      html: `
        <div style="font-family: Inter, Arial, sans-serif; color: #101828; line-height: 1.5;">
          <p>Hi ${escapeHtml(name || "there")},</p>
          <p>${escapeHtml(introText)}:</p>
          <p style="font-size: 28px; font-weight: 800; letter-spacing: 6px; margin: 20px 0;">${escapeHtml(otp)}</p>
          <p>This code expires in ${escapeHtml(String(expiresInMinutes))} minutes.</p>
          <p style="color: #64748b;">${escapeHtml(fallbackIgnoreText)}</p>
        </div>
      `,
    });

    return { delivered: true };
  };
};

const escapeHtml = (value) => {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

module.exports = {
  createSignupOtpSender,
};
