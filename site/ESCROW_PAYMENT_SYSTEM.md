# Escrow Payment System

## Overview
The payment system now works as an escrow service where:
1. **Customer pays** the full amount to Auro
2. **Funds are held** in Auro's account until review completion
3. **Reviewer completes** the review in the app
4. **Payment is automatically distributed** to the reviewer (minus Auro's platform fee)

## Payment Flow

### 1. Customer Payment
- Customer pays full amount via Stripe Checkout
- Funds are held in Auro's Stripe account (no immediate transfer)
- Request status: `paid`

### 2. Review Process
- Reviewer accepts the request: status → `in_progress`
- Reviewer completes the review: status → `completed`
- **Automatic payment distribution triggered**

### 3. Payment Distribution
When a review is completed, the system automatically:
- Calculates reviewer amount: `total_amount - auro_fee`
- Creates Stripe transfer to reviewer's Connect account
- Updates request with payment distribution details

## Database Schema

### New Fields in `requests` Table
```sql
payment_distributed BOOLEAN DEFAULT FALSE
payment_distributed_at TIMESTAMP WITH TIME ZONE
stripe_transfer_id TEXT
reviewer_amount_cents INTEGER
```

## API Endpoints

### Automatic Distribution
**POST** `/api/payments/distribute-reviewer-payment`
- Triggered automatically when review is completed
- Body: `{ "requestId": "uuid" }`
- Creates Stripe transfer to reviewer

### Manual Distribution (Admin)
**POST** `/api/admin/distribute-payment`
- For manual payment distribution if automatic fails
- Body: `{ "requestId": "uuid", "force": false }`
- Can override completion status with `force: true`

## Fee Structure

### Example: $50 Review
- **Customer pays**: $50.00
- **Stripe processing fee**: ~$1.75 (3.5% + $0.30)
- **Auro platform fee**: $7.50 (15% for founders) or $10.00 (20% for regular)
- **Reviewer receives**: ~$40.75 (founders) or ~$38.25 (regular)

### Fee Calculation
```typescript
const totalAmount = request.amount_cents; // e.g., 5000 cents ($50)
const auroFee = request.application_fee_cents; // e.g., 750 cents ($7.50)
const reviewerAmount = totalAmount - auroFee; // e.g., 4250 cents ($42.50)
```

## Error Handling

### Automatic Distribution Fails
- Review submission still succeeds
- Payment can be distributed manually later
- Error logged for admin review

### Reviewer Has No Connect Account
- Payment distribution fails
- Admin notification required
- Reviewer must complete Stripe Connect setup

### Insufficient Funds
- Stripe transfer fails
- Admin notification required
- Manual intervention needed

## Monitoring & Admin Tools

### Check Payment Status
```sql
SELECT 
  id,
  status,
  payment_distributed,
  payment_distributed_at,
  amount_cents,
  reviewer_amount_cents,
  stripe_transfer_id
FROM requests 
WHERE status = 'completed' 
  AND payment_distributed = false;
```

### Manual Payment Distribution
```bash
curl -X POST /api/admin/distribute-payment \
  -H "Content-Type: application/json" \
  -d '{"requestId": "uuid", "force": false}'
```

## Benefits

### For Customers
- **Protected payments**: Money only released after review completion
- **Quality assurance**: Ensures reviewers deliver before payment
- **Refund protection**: Can refund if review not completed

### For Reviewers
- **Guaranteed payment**: Automatic distribution upon completion
- **No payment delays**: Immediate transfer when review submitted
- **Transparent fees**: Clear breakdown of platform fees

### For Auro
- **Quality control**: Payment tied to review completion
- **Reduced disputes**: Clear payment terms
- **Automated process**: Minimal manual intervention needed

## Setup Requirements

### Stripe Connect
- Enable Stripe Connect in dashboard
- Set up Express accounts for reviewers
- Configure platform settings

### Environment Variables
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Database Migration
Run the migration to add payment distribution fields:
```bash
supabase db push
```

## Testing

### Test Payment Flow
1. Create test request
2. Complete payment
3. Accept request as reviewer
4. Submit review
5. Verify automatic payment distribution

### Test Error Scenarios
1. Reviewer without Connect account
2. Insufficient funds
3. Network failures during distribution

## Troubleshooting

### Payment Not Distributed
1. Check reviewer has Connect account set up
2. Verify request status is 'completed'
3. Check Stripe transfer logs
4. Use manual distribution endpoint

### Reviewer Not Receiving Payment
1. Verify Connect account is active
2. Check transfer status in Stripe dashboard
3. Confirm reviewer amount calculation
4. Review transfer metadata

## Future Enhancements

### Planned Features
- **Partial payments**: For multi-part reviews
- **Payment scheduling**: Delayed distribution options
- **Dispute handling**: Payment hold for disputes
- **Analytics dashboard**: Payment distribution metrics
- **Automated refunds**: For incomplete reviews
