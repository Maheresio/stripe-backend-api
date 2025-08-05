// pages/api/create-customer.ts (for Next.js) OR in your Express router file

import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

// Initialize Stripe with your secret key (make sure it's in .env)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-07-30.basil',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, name } = req.body;

    if (!email || !name) {
        return res.status(400).json({ error: 'Missing email or name' });
    }

    try {
        // Create Stripe customer
        const customer = await stripe.customers.create({
            email,
            name,
        });

        // You can store customer.id (e.g., 'cus_abc123') in Firestore or your DB here if needed

        return res.status(200).json({ customerId: customer.id });
    } catch (error: any) {
        console.error('Stripe error:', error.message);
        return res.status(500).json({ error: 'Failed to create Stripe customer' });
    }
}
