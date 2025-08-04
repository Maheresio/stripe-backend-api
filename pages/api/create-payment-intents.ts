import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Only POST allowed' });

  const { amount, customerId, paymentMethodId } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount, // in cents (e.g., $10 = 1000)
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      confirm: false, // you can set true if you want to auto confirm
      setup_future_usage: 'off_session', // save card for future use
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    console.error('[Stripe PaymentIntent Error]', error.message);
    res.status(500).json({ error: error.message });
  }
}
