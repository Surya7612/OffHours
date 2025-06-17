# RevenueCat Setup Guide for OffHours

## Current Status ✅
You've successfully created the `yearly_first50` offering in RevenueCat. Great start!

## Next Steps to Complete Setup

### 1. Create Packages for the Offering

Click on the **"Packages"** tab in your `yearly_first50` offering and create a package:

**Package Configuration:**
- **Identifier**: `yearly_first50_package`
- **Display Name**: `Founding Member Yearly`
- **Product**: Link to your Stripe product `offhours_yearly_first50_12_99`

### 2. Create the Stripe Products (if not done already)

In your Stripe dashboard, create these products:

#### Product 1: Monthly Plan
- **Name**: `OffHours Monthly`
- **Pricing**: `$4.00 USD` recurring monthly
- **Product ID**: `offhours_monthly_4_99`

#### Product 2: Regular Yearly Plan  
- **Name**: `OffHours Yearly`
- **Pricing**: `$24.00 USD` recurring yearly
- **Product ID**: `offhours_yearly_24_99`

#### Product 3: First 50 Users Yearly Plan
- **Name**: `OffHours Founding Member Yearly`
- **Pricing**: `$12.00 USD` recurring yearly
- **Product ID**: `offhours_yearly_first50_12_99`

### 3. Create Additional RevenueCat Offerings

You'll need **3 total offerings**:

#### Offering 1: `monthly_plan` ✅ (Create this)
- **Identifier**: `monthly_plan`
- **Display Name**: `Monthly Subscription`
- **Package**: Link to monthly Stripe product

#### Offering 2: `yearly_plan` ✅ (Create this)
- **Identifier**: `yearly_plan` 
- **Display Name**: `Yearly Subscription`
- **Package**: Link to regular yearly Stripe product

#### Offering 3: `yearly_first50` ✅ (Already created!)
- **Identifier**: `yearly_first50`
- **Display Name**: `Founding Member Yearly`
- **Package**: Link to discounted yearly Stripe product

### 4. Update Your App Configuration

Your app code is already set up to handle this! The key logic is in `src/utils/revenueCat.ts`:

```typescript
// The app automatically detects if user is in first 50
const isFirst50 = this.isFirst50User(userId);

// Shows appropriate offering based on user status
const plans = [
  {
    id: 'monthly_plan',
    productId: 'offhours_monthly_4_99',
    price: 4.00,
    period: 'monthly'
  },
  {
    id: isFirst50 ? 'yearly_first50' : 'yearly_plan',
    productId: isFirst50 ? 'offhours_yearly_first50_12_99' : 'offhours_yearly_24_99',
    price: isFirst50 ? 12.00 : 24.00,
    period: 'yearly'
  }
];
```

### 5. Testing Your Setup

1. **Test with First 50 User**: 
   - User IDs 1-50 should see the $12/year option
   - Coupon code "FIRST50" should work

2. **Test with Regular User**:
   - User IDs 51+ should see the $24/year option
   - Coupon code should be rejected

### 6. Production Checklist

Before going live:
- [ ] All 3 Stripe products created
- [ ] All 3 RevenueCat offerings configured  
- [ ] Packages linked to correct Stripe products
- [ ] Test purchases in sandbox mode
- [ ] Webhook endpoints configured
- [ ] App Store/Play Store products configured (for mobile)

## Your Current Architecture 🎯

```
RevenueCat Offerings:
├── monthly_plan → $4.00/month
├── yearly_plan → $24.00/year (regular users)
└── yearly_first50 → $12.00/year (first 50 users only)
```

This gives you:
- ✅ Clean separation of pricing tiers
- ✅ Easy tracking of first 50 users
- ✅ Ability to disable first 50 offer after limit reached
- ✅ Better analytics and conversion tracking

## Next Action Required

**Click "Create a package to get started"** in your `yearly_first50` offering and link it to your Stripe product!