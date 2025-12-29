import * as InAppPurchase from 'react-native-iap';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import Constants from 'expo-constants';
import { getTierInfo, getProductIdForRate } from './iapPriceTiers';

// Calculate in-app purchase price to account for Apple's 30% cut while preserving 20% margin
// Formula: IAP_price = web_price * 1.43 (rounded up)
// Note: This is now handled by the tier system - use getTierInfo() instead
export function calculateIAPPrice(webPrice: number): number {
  return Math.ceil(webPrice * 1.43);
}

// Initialize in-app purchases
export async function initIAP(): Promise<boolean> {
  try {
    if (Platform.OS !== 'ios') {
      console.log('[IAP] In-app purchases only supported on iOS');
      return false;
    }

    await InAppPurchase.initConnection();
    console.log('[IAP] Connection initialized');
    return true;
  } catch (error) {
    console.error('[IAP] Failed to initialize:', error);
    return false;
  }
}

// Purchase a review request
// If productId is not provided, it will be calculated from the reviewer's rate
export async function purchaseReviewRequest(params: {
  productId?: string; // Optional - will be calculated from reviewerRate if not provided
  reviewerRate?: number; // Reviewer's hourly rate (web price) - used to find tier if productId not provided
  creatorId: string;
  creatorSlug?: string;
  uploadSessionId?: string;
  reviewPayload: {
    message: string;
    photos: string[];
    consent: boolean;
  };
}): Promise<{ success: boolean; requestId?: string; error?: string }> {
  try {
    if (Platform.OS !== 'ios') {
      return { success: false, error: 'In-app purchases only supported on iOS' };
    }

    // Determine product ID - use provided one or calculate from reviewer rate
    let productId = params.productId;
    if (!productId && params.reviewerRate) {
      productId = getProductIdForRate(params.reviewerRate);
      console.log('[IAP] Calculated product ID from rate:', params.reviewerRate, '->', productId);
    }

    if (!productId) {
      return { success: false, error: 'Product ID or reviewer rate required' };
    }

    console.log('[IAP] Starting purchase for product:', productId);

    // Request purchase
    const purchase = await InAppPurchase.requestPurchase({
      sku: productId,
      andDangerouslyFinishTransactionAutomatically: false,
    });

    if (!purchase || !purchase.transactionReceipt) {
      return { success: false, error: 'Purchase failed: No receipt received' };
    }

    console.log('[IAP] Purchase successful, verifying with server...');

    // Verify purchase with our backend
    const siteUrl = 
      process.env.EXPO_PUBLIC_SITE_URL || 
      (Constants.expoConfig?.extra as any)?.siteUrl || 
      (Constants.manifest2 as any)?.extra?.siteUrl || 
      'https://www.appauro.com';

    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token || '';

    const verifyResponse = await fetch(`${siteUrl}/api/payments/verify-iap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        receipt: purchase.transactionReceipt,
        productId: productId,
        transactionId: purchase.transactionId,
        creatorId: params.creatorId,
        creatorSlug: params.creatorSlug,
        uploadSessionId: params.uploadSessionId,
        reviewPayload: params.reviewPayload,
        reviewerRate: params.reviewerRate, // Include original rate for reference
      }),
    });

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json().catch(() => ({}));
      return { success: false, error: errorData.error || 'Failed to verify purchase' };
    }

    const verifyData = await verifyResponse.json();

    // Finish the transaction
    if (purchase.transactionId) {
      await InAppPurchase.finishTransaction({
        transactionId: purchase.transactionId,
      });
    }

    console.log('[IAP] Purchase verified, request ID:', verifyData.requestId);

    return {
      success: true,
      requestId: verifyData.requestId,
    };
  } catch (error: any) {
    console.error('[IAP] Purchase error:', error);
    return {
      success: false,
      error: error.message || 'Purchase failed',
    };
  }
}

// Get available products (for future use if we want to fetch product info)
export async function getProducts(productIds: string[]): Promise<InAppPurchase.Product[]> {
  try {
    if (Platform.OS !== 'ios') {
      return [];
    }

    const products = await InAppPurchase.getProducts({ skus: productIds });
    return products;
  } catch (error) {
    console.error('[IAP] Failed to get products:', error);
    return [];
  }
}

// Clean up IAP connection
export async function endConnection(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      await InAppPurchase.endConnection();
    }
  } catch (error) {
    console.error('[IAP] Failed to end connection:', error);
  }
}
