// pages/api/stripe/create-setup-intent.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Only POST allowed' });
    }
  
    const { customerId, cardToken } = req.body;
    if (!customerId || !cardToken) {
      return res.status(400).json({ error: 'Missing customerId or cardToken' });
    }
  
    try {
        console.log('Creating PaymentMethod from token');
        const paymentMethod = await stripe.paymentMethods.create({
          type: 'card',
          card: { token: cardToken },
        });

        console.log('Attaching PaymentMethod to customer');
        await stripe.paymentMethods.attach(paymentMethod.id, {
          customer: customerId,
        });
  
        console.log('Creating SetupIntent with paymentMethod:', paymentMethod.id);
        // First, create the SetupIntent without confirming
        const setupIntent = await stripe.setupIntents.create({
          customer: customerId,
          payment_method: paymentMethod.id,
          payment_method_types: ['card'],
          usage: 'off_session'
        });

        // Then confirm it
        const confirmedIntent = await stripe.setupIntents.confirm(setupIntent.id, {
          payment_method: paymentMethod.id
        });
  
        console.log('SetupIntent status:', confirmedIntent.status);
        res.status(200).json({
          clientSecret: confirmedIntent.client_secret,
          paymentMethodId: confirmedIntent.payment_method,
          setupIntentId: confirmedIntent.id,
          status: confirmedIntent.status,
        });
    } catch (err: any) {
        console.error('Stripe error:', err);
        const errType = err.type || 'unknown_error';
        res.status(err.statusCode ?? 500).json({
          error: err.message ?? 'Unexpected error',
          type: errType,
          param: err.param,
        });
    }
}