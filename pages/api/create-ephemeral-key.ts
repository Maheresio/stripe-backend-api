import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil", // must match your Stripe Flutter SDK version
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { customer_id } = req.body;

    if (!customer_id) {
      return res.status(400).json({ error: "Missing customer_id" });
    }

    // Create ephemeral key for the customer
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer_id },
      { apiVersion: "2023-10-16" } // must be passed explicitly
    );

    res.status(200).json({
      ephemeralKeySecret: ephemeralKey.secret,
    });
  } catch (error: any) {
    console.error("[Ephemeral Key Error]", error.message);
    res.status(400).json({ error: error.message });
  }
}
