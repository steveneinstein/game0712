const crypto = require("crypto");
const Razorpay = require("razorpay");
const { randomUUID } = require("crypto");
const { settings } = require("../config/game");
const { query } = require("../db/mysql");

const memoryTransactions = new Map();

let razorpayClient = null;

function getRazorpayClient() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }

  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }

  return razorpayClient;
}

function getPublicPaymentConfig() {
  return {
    enabled: Boolean(getRazorpayClient()),
    keyId: process.env.RAZORPAY_KEY_ID || "",
    currency: "INR",
    provider: "razorpay"
  };
}

function requirePaymentProvider() {
  const client = getRazorpayClient();

  if (!client) {
    throw new Error("Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }

  return client;
}

function normalizeAmount(value) {
  const amount = Number(value);

  if (!/^\d+$/.test(String(value).trim()) || !Number.isInteger(amount) || amount <= 0) {
    throw new Error("Enter a whole rupee amount.");
  }

  return amount;
}

function assertPlayerCanAdd(player, amount) {
  const left = settings.maxPurchasePerPlayer - Number(player.purchasedTotal || 0);

  if (amount > left) {
    throw new Error(`This player can add up to Rs ${Math.max(0, left)} right now.`);
  }
}

async function createWalletOrder({ player, amount }) {
  const walletAmount = normalizeAmount(amount);
  assertPlayerCanAdd(player, walletAmount);

  const razorpay = requirePaymentProvider();
  const transactionId = randomUUID();
  const order = await razorpay.orders.create({
    amount: walletAmount * 100,
    currency: "INR",
    receipt: transactionId,
    notes: {
      playerId: String(player.id),
      playerName: player.name
    }
  });

  const transaction = {
    transactionId,
    playerId: player.id,
    amount: walletAmount,
    currency: "INR",
    providerOrderId: order.id,
    providerPaymentId: null,
    providerSignature: null,
    status: "created",
    errorMessage: null,
    metadata: { order }
  };

  await saveTransaction(transaction);

  return {
    amount: walletAmount,
    currency: "INR",
    keyId: process.env.RAZORPAY_KEY_ID,
    orderId: order.id,
    player: {
      id: player.id,
      name: player.name
    },
    transactionId
  };
}

async function verifyWalletPayment(payload) {
  const orderId = String(payload.razorpay_order_id || "");
  const paymentId = String(payload.razorpay_payment_id || "");
  const signature = String(payload.razorpay_signature || "");
  const transaction = await findTransactionByOrderId(orderId);

  if (!transaction) {
    throw new Error("Payment transaction was not found.");
  }

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (!safeCompare(expected, signature)) {
    await markTransactionFailed(transaction.transactionId, "Invalid Razorpay signature.");
    throw new Error("Payment verification failed.");
  }

  if (transaction.status === "credited") {
    return transaction;
  }

  await updateTransactionStatus(transaction.transactionId, {
    providerPaymentId: paymentId,
    providerSignature: signature,
    status: "verified"
  });

  return {
    ...transaction,
    providerPaymentId: paymentId,
    providerSignature: signature,
    status: "verified"
  };
}

async function markTransactionCredited(transactionId) {
  await updateTransactionStatus(transactionId, { status: "credited" });
}

async function markTransactionFailed(transactionId, errorMessage) {
  await updateTransactionStatus(transactionId, {
    status: "failed",
    errorMessage: String(errorMessage || "Payment failed.").slice(0, 255)
  });
}

async function handleWebhook(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("Razorpay webhook secret is not configured.");
  }

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  if (!signature || !safeCompare(expected, signature)) {
    throw new Error("Invalid webhook signature.");
  }

  const event = JSON.parse(rawBody.toString("utf8"));
  const payment = event.payload?.payment?.entity;

  if (event.event === "payment.failed" && payment?.order_id) {
    const transaction = await findTransactionByOrderId(payment.order_id);

    if (transaction) {
      await markTransactionFailed(transaction.transactionId, payment.error_description || "Payment failed.");
    }
  }

  if (event.event === "payment.captured" && payment?.order_id) {
    const transaction = await findTransactionByOrderId(payment.order_id);

    if (transaction && transaction.status === "created") {
      await updateTransactionStatus(transaction.transactionId, {
        providerPaymentId: payment.id,
        status: "paid",
        metadata: { webhook: event }
      });

      return {
        ok: true,
        capturedTransaction: {
          ...transaction,
          providerPaymentId: payment.id,
          status: "paid"
        }
      };
    }
  }

  return { ok: true };
}

async function saveTransaction(transaction) {
  memoryTransactions.set(transaction.providerOrderId, transaction);

  await query(
    `INSERT INTO wallet_transactions
      (transaction_id, player_id, amount, currency, provider_order_id, status, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      transaction.transactionId,
      transaction.playerId,
      transaction.amount,
      transaction.currency,
      transaction.providerOrderId,
      transaction.status,
      JSON.stringify(transaction.metadata || {})
    ]
  );
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

async function findTransactionByOrderId(orderId) {
  const rows = await query(
    `SELECT
      transaction_id AS transactionId,
      player_id AS playerId,
      amount,
      currency,
      provider_order_id AS providerOrderId,
      provider_payment_id AS providerPaymentId,
      provider_signature AS providerSignature,
      status,
      error_message AS errorMessage
     FROM wallet_transactions
     WHERE provider_order_id = ?
     LIMIT 1`,
    [orderId]
  );

  if (rows && rows[0]) {
    return rows[0];
  }

  return memoryTransactions.get(orderId) || null;
}

async function updateTransactionStatus(transactionId, changes) {
  for (const transaction of memoryTransactions.values()) {
    if (transaction.transactionId === transactionId) {
      Object.assign(transaction, changes);
      break;
    }
  }

  const fields = [];
  const values = [];

  if (changes.providerPaymentId !== undefined) {
    fields.push("provider_payment_id = ?");
    values.push(changes.providerPaymentId);
  }

  if (changes.providerSignature !== undefined) {
    fields.push("provider_signature = ?");
    values.push(changes.providerSignature);
  }

  if (changes.status !== undefined) {
    fields.push("status = ?");
    values.push(changes.status);
  }

  if (changes.errorMessage !== undefined) {
    fields.push("error_message = ?");
    values.push(changes.errorMessage);
  }

  if (changes.metadata !== undefined) {
    fields.push("metadata = ?");
    values.push(JSON.stringify(changes.metadata));
  }

  if (fields.length === 0) {
    return;
  }

  values.push(transactionId);
  await query(`UPDATE wallet_transactions SET ${fields.join(", ")} WHERE transaction_id = ?`, values);
}

module.exports = {
  createWalletOrder,
  getPublicPaymentConfig,
  handleWebhook,
  markTransactionCredited,
  verifyWalletPayment
};
