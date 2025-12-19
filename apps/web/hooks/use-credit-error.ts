'use client';

import { useState, useCallback } from 'react';

export interface CreditErrorInfo {
  show: boolean;
  message: string;
}

export function useCreditError() {
  const [creditError, setCreditError] = useState<CreditErrorInfo>({
    show: false,
    message: '',
  });

  const showCreditError = useCallback((message?: string) => {
    setCreditError({
      show: true,
      message: message || 'Hey! You ran out of credits. Please upgrade to remove watermark and generate videos!',
    });
  }, []);

  const hideCreditError = useCallback(() => {
    setCreditError({
      show: false,
      message: '',
    });
  }, []);

  const handleApiError = useCallback((error: any) => {
    const errorMessage = error?.response?.data?.message || error?.message || '';
    const isInsufficientCredits = 
      errorMessage.toLowerCase().includes('insufficient credit') ||
      errorMessage.toLowerCase().includes('out of credit') ||
      errorMessage.toLowerCase().includes('not enough credit') ||
      error?.response?.status === 402; // Payment Required status code

    if (isInsufficientCredits) {
      showCreditError(errorMessage);
      return true;
    }
    return false;
  }, [showCreditError]);

  return {
    creditError,
    showCreditError,
    hideCreditError,
    handleApiError,
  };
}
