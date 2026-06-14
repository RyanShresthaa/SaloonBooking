import env from '../config/Env.js';
import { Appointment } from '../models/Index.js';
import { sendBadRequest, sendSuccess } from '../utils/apiResponse.js';

// ─── Constants ───

const FALLBACK_STRIPE_CURRENCY = 'usd';

// ─── Module state ───

let stripeClient = null;

// ─── Helpers ───

async function getStripe() {
  if (!env.stripe?.secretKey) return null;
  if (!stripeClient) {
    const { default: Stripe } = await import('stripe');
    stripeClient = new Stripe(env.stripe.secretKey);
  }
  return stripeClient;
}

// ─── Handlers ───

/** Customer: pay a fixed deposit for an appointment they own (Stripe Checkout). */
const createDepositCheckout = async (req, res, next) => {
  try {
    if (env.features?.stripeDeposits === false) {
      return sendBadRequest(res, 'Card deposits are disabled for this deployment.');
    }
    const stripe = await getStripe();
    if (!stripe) {
      return sendBadRequest(res, 'Stripe is not configured (set STRIPE_SECRET_KEY).');
    }

    const { appointmentId } = req.body;
    if (!appointmentId) return sendBadRequest(res, 'appointmentId is required');

    const appt = await Appointment.findByPk(appointmentId);
    if (!appt) return sendBadRequest(res, 'Appointment not found');
    if (appt.userId !== req.user.id) {
      return sendBadRequest(res, 'You can only pay for your own bookings');
    }
    if (appt.status === 'cancelled') {
      return sendBadRequest(res, 'Cannot collect a deposit for a cancelled visit');
    }

    const amount = env.stripe.depositAmountCents;
    const currency = (env.stripe.currency || FALLBACK_STRIPE_CURRENCY).toLowerCase();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: appt.id,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `Salon deposit — ${appt.appointmentDate}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${env.clientUrl}/appointments/${appt.id}/edit?deposit=success`,
      cancel_url: `${env.clientUrl}/appointments/${appt.id}/edit?deposit=cancel`,
      metadata: { appointmentId: appt.id, userId: req.user.id },
    });

    return sendSuccess(res, { url: session.url, sessionId: session.id }, 'Checkout session created');
  } catch (error) {
    next(error);
  }
};

// ─── Exports ───

export { createDepositCheckout };
