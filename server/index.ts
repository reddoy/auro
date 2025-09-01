import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';

const app = express();
app.use(cors());
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });

app.post('/payments/create-payment-sheet', async (req, res) => {
  try {
    const { amountCents, currency } = req.body as { amountCents: number; currency: string };
    // Create a Customer for PaymentSheet
    const customer = await stripe.customers.create();
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: '2024-06-20' }
    );
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      customer: customer.id,
      automatic_payment_methods: { enabled: true },
    });
    res.json({
      paymentIntentClientSecret: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customerId: customer.id,
      merchantDisplayName: 'Auro',
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Failed to create payment sheet' });
  }
});

// Placeholder for Connect; later attach application_fee_amount and transfer_data
app.post('/connect/create-account', async (_req, res) => {
  try {
    const account = await stripe.accounts.create({ type: 'express' });
    const link = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: 'https://example.com/reauth',
      return_url: 'https://example.com/return',
      type: 'account_onboarding',
    });
    res.json({ accountId: account.id, onboardingUrl: link.url });
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Failed to start onboarding' });
  }
});

const port = process.env.PORT || 4242;
app.listen(port, () => console.log(`Server listening on ${port}`));



