import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import admin from 'firebase-admin';
import { buffer } from 'micro';


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-07-30.basil',

});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export const config = {
    api: {
        bodyParser: false, // raw body required for Stripe
    },
};

if (!admin.apps.length) {
    admin.initializeApp();
}

const firestore = admin.firestore();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const buf = await buffer(req);
    const sig = req.headers['stripe-signature']!;

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
    } catch (err: any) {
        console.error('Webhook signature error:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        if (event.type === 'payment_intent.succeeded') {
            const intent = event.data.object as Stripe.PaymentIntent;
            const orderId = intent.metadata.orderId;

            await firestore.collection('orders').doc(orderId).update({
                status: 'delivered',
                paymentId: intent.id,
            });
        }

        if (event.type === 'payment_intent.payment_failed') {
            const intent = event.data.object as Stripe.PaymentIntent;
            const orderId = intent.metadata.orderId;

            await firestore.collection('orders').doc(orderId).update({
                status: 'cancelled',
                paymentId: intent.id,
            });
        }

        res.status(200).json({ received: true });
    } catch (err: any) {
        console.error('Webhook handler error:', err);
        res.status(500).send('Internal Server Error');
    }
}
