const { Pool } = require("pg");
const Stripe = require("stripe");
const { createTunnel } = require('tunnel-ssh');
const { parse } = require("pg-connection-string");

let stripe = null;
let pool = null;
let tunnelServer = null;

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (STRIPE_SECRET_KEY) {
  try {
    stripe = Stripe(STRIPE_SECRET_KEY);
    console.log("✅ Stripe client initialized.");
  } catch (e) {
    console.error("❌ Failed to initialize Stripe client:", e.message);
  }
} else {
  console.warn("⚠️ STRIPE_SECRET_KEY not found. Stripe not initialized.");
}

const connectionString = process.env.DATABASE_CONNECTIONSTRING;

async function initPoolWithTunnel() {
  const parsed = parse(connectionString);
  const LOCAL_PORT = 54320;

  const tunnelOptions = { autoClose: true };
  const serverOptions = { host: '127.0.0.1', port: LOCAL_PORT };
  const sshOptions = {
    host: process.env.BASTION_HOST,
    username: process.env.BASTION_USER || 'ec2-user',
    privateKey: process.env.BASTION_PRIVATE_KEY,
    port: 22
  };
  const forwardOptions = {
    srcAddr: '127.0.0.1',
    srcPort: LOCAL_PORT,
    dstAddr: parsed.host,
    dstPort: parsed.port || 5432
  };

  const [server, conn] = await createTunnel(
    tunnelOptions,
    serverOptions,
    sshOptions,
    forwardOptions
  );

  server.on('error', err => console.error('SSH tunnel server error:', err));
  conn.on('error', err => console.error('SSH client error:', err));

  pool = new Pool({
    user: parsed.user,
    password: parsed.password,
    database: parsed.database,
    host: '127.0.0.1',
    port: LOCAL_PORT,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 60000
  });

  pool.on('error', err =>
    console.error('❌ Unexpected error on idle DB client', err)
  );

  console.log('✅ DB pool initialized via SSH tunnel.');

  return pool;
}

module.exports = {
  getDBPool: initPoolWithTunnel,
  stripe,
  closeTunnel: () => {
    if (tunnelServer) tunnelServer.close();
  },
};
