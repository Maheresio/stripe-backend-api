import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import admin from 'firebase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

if (!admin.apps.length) {
  admin.initializeApp()
}

const firestore = admin.firestore()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sig = req.headers['stripe-signature']!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent
    const orderId = intent.metadata.orderId
    const userId = intent.metadata.userId

    if (!userId) {
      console.error('No userId found in payment intent metadata')
      return res.status(400).json({ error: 'Missing userId in metadata' })
    }

    // Store order in user's subcollection
    await firestore.collection('users').doc(userId).collection('orders').doc(orderId).set({
      status: 'delivered',
      amount: intent.amount,
      currency: intent.currency,
      created: intent.created,
      paymentMethod: intent.payment_method,
      // Include any other relevant order data
      ...(intent.metadata || {}) // Spread any additional metadata
    }, { merge: true })
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as Stripe.PaymentIntent
    const orderId = intent.metadata.orderId
    const userId = intent.metadata.userId

    if (!userId) {
      console.error('No userId found in payment intent metadata')
      return res.status(400).json({ error: 'Missing userId in metadata' })
    }

    // Update order status in user's subcollection
    await firestore.collection('users').doc(userId).collection('orders').doc(orderId).set({
      status: 'cancelled',
      lastError: intent.last_payment_error?.message || 'Payment failed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true })
  }

  res.status(200).json({ received: true })
}
