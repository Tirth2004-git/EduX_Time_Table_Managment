const Razorpay = require('razorpay');
const crypto = require('crypto');

const getRazorpayConfig = () => {
  const keyId = process.env.RAZORPAY_KEY_ID ;
  const keySecret = process.env.RAZORPAY_KEY_SECRET ;
  return { keyId, keySecret };
};

const getRazorpayInstance = () => {
  const { keyId, keySecret } = getRazorpayConfig();
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

/**
 * Creates a Razorpay order
 * @param {Object} params
 * @param {number} params.amountInRupees - Amount in INR (will be converted to paise)
 * @param {string} [params.currency='INR']
 * @param {string} [params.receipt]
 * @param {Object} [params.notes]
 */
async function createRazorpayOrder({ amountInRupees, currency = 'INR', receipt, notes = {} }) {
  const instance = getRazorpayInstance();
  const amountInPaise = Math.round(Number(amountInRupees) * 100);

  const options = {
    amount: amountInPaise,
    currency,
    receipt: receipt || `rcpt_${Date.now()}`,
    notes,
  };

  const order = await instance.orders.create(options);
  return order;
}

/**
 * Verifies Razorpay Checkout signature using HMAC-SHA256
 * @param {Object} params
 * @param {string} params.orderId
 * @param {string} params.paymentId
 * @param {string} params.signature
 * @returns {boolean}
 */
function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!orderId || !paymentId || !signature) return false;
  const { keySecret } = getRazorpayConfig();

  const generatedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(generatedSignature, 'utf-8'),
      Buffer.from(signature, 'utf-8')
    );
  } catch {
    return false;
  }
}

/**
 * Verifies Razorpay Webhook signature
 * @param {string|Buffer} rawBody
 * @param {string} webhookSignature
 * @returns {boolean}
 */
function verifyWebhookSignature(rawBody, webhookSignature) {
  if (!rawBody || !webhookSignature) return false;
  const { keySecret } = getRazorpayConfig();
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || keySecret;
  if (!secret) return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf-8'),
      Buffer.from(webhookSignature, 'utf-8')
    );
  } catch {
    return false;
  }
}

function getPublicKeyId() {
  const { keyId } = getRazorpayConfig();
  return keyId;
}

module.exports = {
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  getPublicKeyId,
};
