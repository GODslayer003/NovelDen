import net from 'net';
import dns from 'dns';
import { promisify } from 'util';

const lookup = promisify(dns.lookup);

async function check(host, port, timeout = 8000) {
  try {
    // Try DNS lookup for IPv4
    try {
      const r = await lookup(host, { family: 4 });
      if (r && r.address) host = r.address;
    } catch (e) {
      // continue with original host
    }

    return await new Promise((resolve, reject) => {
      const socket = net.connect({ host, port }, () => {
        socket.end();
        resolve({ ok: true, host, port });
      });
      socket.setTimeout(timeout, () => {
        socket.destroy();
        reject(new Error('connect timeout'));
      });
      socket.on('error', (err) => {
        reject(err);
      });
    });
  } catch (err) {
    return { ok: false, error: err.message || err.toString() };
  }
}

if (require.main === module) {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const timeout = process.env.SMTP_ATTEMPT_TIMEOUT_MS ? parseInt(process.env.SMTP_ATTEMPT_TIMEOUT_MS, 10) : 8000;
  check(host, port, timeout).then((res) => console.log(res)).catch((e) => console.error(e));
}

export default check;
