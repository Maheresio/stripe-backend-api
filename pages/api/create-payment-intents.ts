import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Only POST allowed' });

  const { amount, customerId, paymentMethodId, orderId } = req.body;

  if (!amount || !customerId || !orderId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const params: Stripe.PaymentIntentCreateParams = {
      amount, // amount in cents
      currency: 'usd',
      customer: customerId,
      metadata: { orderId },
      setup_future_usage: 'off_session', // ensures card is saved for later
    };

    if (paymentMethodId) {
      params.payment_method = paymentMethodId;
    }

    const paymentIntent = await stripe.paymentIntents.create(params);

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error('[Stripe PaymentIntent Error]', error.message);
    res.status(500).json({ error: error.message });
  }
}
