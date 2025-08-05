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

    try {
        // Step 1: Convert token into a PaymentMethod
        const paymentMethod = await stripe.paymentMethods.create({
            type: 'card',
            card: { token: cardToken },
        });

        // Step 2: Use payment_method ID in SetupIntent
        const setupIntent = await stripe.setupIntents.create({
            customer: customerId,
            payment_method: paymentMethod.id,
            usage: 'off_session',
            confirm: true,
        });

        res.status(200).json({
            clientSecret: setupIntent.client_secret,
            paymentMethodId: setupIntent.payment_method,
        });
    } catch (err: any) {
        console.error('Stripe error:', err);
        res.status(500).json({ error: err.message });
    }
}
