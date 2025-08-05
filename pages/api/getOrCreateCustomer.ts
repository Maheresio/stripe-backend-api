import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import admin from 'firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-07-30.basil',
});

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { firebaseUID, email, name } = req.body;

  if (!firebaseUID || !email || !name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const userRef = admin.firestore().collection('users').doc(firebaseUID);
    const userDoc = await userRef.get();
    const existingCustomerId = userDoc.data()?.stripeCustomerId;

    if (existingCustomerId) {
      return res.status(200).json({ customerId: existingCustomerId });
    }

    // Create a new Stripe customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: { firebaseUID },
    });

    // Save to Firestore
    await userRef.set({ stripeCustomerId: customer.id }, { merge: true });

    return res.status(200).json({ customerId: customer.id });
  } catch (error: any) {
    console.error('Error in getOrCreateCustomer:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
