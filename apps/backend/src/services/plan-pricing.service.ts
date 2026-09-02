export const MONTHLY_PLAN_PRICES: Record<string, number> = {
  STARTER: 1499,
  PRO: 3999,
  ENTERPRISE: 8999,
};

export const ANNUAL_PLAN_PRICES: Record<string, number> = {
  STARTER: 1199 * 12, // 14388
  PRO: 3199 * 12, // 38388
  ENTERPRISE: 7199 * 12, // 86388
};

export interface PlanQuote {
  originalAmount: number;
  discount: number;
  finalAmount: number;
  payableAmount: number; // final amount inclusive of 18% GST, rounded to the rupee
}

/**
 * Computes the exact amount (INR, GST-inclusive) a plan purchase should cost
 * right now, including pro-rated credit for any unused time left on the
 * organization's current plan. Shared by the pre-purchase quote endpoint and
 * the actual purchase endpoint so the two can never drift — and so a
 * purchase can be checked against the amount Razorpay actually captured.
 */
export function computePlanQuote(
  planTier: string,
  billingCycle: string,
  currentPlanTier: string | null | undefined,
  currentPlanExpiryDate: Date | null | undefined
): PlanQuote {
  const now = new Date();
  const isCurrentPlanActive = !!currentPlanExpiryDate && currentPlanExpiryDate > now;

  const requestedPlanPrice =
    billingCycle === 'ANNUAL'
      ? ANNUAL_PLAN_PRICES[planTier] || ANNUAL_PLAN_PRICES.PRO
      : MONTHLY_PLAN_PRICES[planTier] || MONTHLY_PLAN_PRICES.PRO;

  let discount = 0;
  if (isCurrentPlanActive && currentPlanTier) {
    const unusedDays = Math.ceil((currentPlanExpiryDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    let currentPlanPrice = 0;
    let dailyRate = 0;

    if (unusedDays > 31) {
      currentPlanPrice = ANNUAL_PLAN_PRICES[currentPlanTier] || 0;
      dailyRate = currentPlanPrice / 365;
    } else {
      currentPlanPrice = MONTHLY_PLAN_PRICES[currentPlanTier] || 0;
      dailyRate = currentPlanPrice / 30;
    }

    if (unusedDays > 0) {
      discount = Math.round(dailyRate * unusedDays);
    }
  }

  let finalAmount = requestedPlanPrice - discount;
  if (finalAmount < 0) finalAmount = 0;

  const payableAmount = Math.round(finalAmount * 1.18);

  return { originalAmount: requestedPlanPrice, discount, finalAmount, payableAmount };
}
