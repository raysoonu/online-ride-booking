import crypto from 'crypto'

export interface EsewaPaymentPayload {
  amount: string
  tax_amount: string
  total_amount: string
  transaction_uuid: string
  product_code: string
  product_service_charge: string
  product_delivery_charge: string
  success_url: string
  failure_url: string
  signed_field_names: string
  signature: string
}

export class EsewaService {
  private static get secretKey(): string {
    return process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q'
  }

  private static get productCode(): string {
    return process.env.NEXT_PUBLIC_ESEWA_PRODUCT_CODE || 'EPAYTEST'
  }

  private static get gatewayUrl(): string {
    return process.env.NEXT_PUBLIC_ESEWA_GATEWAY_URL || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form'
  }

  /**
   * Generates HMAC-SHA256 Base64 signature for eSewa v2
   */
  public static generateSignature(totalAmount: string, transactionUuid: string, productCode: string = this.productCode): string {
    const dataToSign = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`
    const hmac = crypto.createHmac('sha256', this.secretKey)
    hmac.update(dataToSign)
    return hmac.digest('base64')
  }

  /**
   * Prepares payload required for eSewa Form submission
   */
  public static preparePaymentPayload({
    amount,
    bookingNumber,
    baseUrl,
  }: {
    amount: number
    bookingNumber: string
    baseUrl: string
  }): { payload: EsewaPaymentPayload; gatewayUrl: string } {
    // Format amount without extra trailing zeros (e.g. "100" instead of "100.00") so eSewa HMAC signature matches
    const formattedAmount = Number(amount.toFixed(2)).toString()
    const productCode = this.productCode
    const transactionUuid = `${bookingNumber}_${Date.now()}`
    const signedFieldNames = 'total_amount,transaction_uuid,product_code'

    const signature = this.generateSignature(formattedAmount, transactionUuid, productCode)

    const payload: EsewaPaymentPayload = {
      amount: formattedAmount,
      tax_amount: '0',
      total_amount: formattedAmount,
      transaction_uuid: transactionUuid,
      product_code: productCode,
      product_service_charge: '0',
      product_delivery_charge: '0',
      success_url: `${baseUrl}/api/payments/esewa/success`,
      failure_url: `${baseUrl}/api/payments/esewa/failure`,
      signed_field_names: signedFieldNames,
      signature: signature,
    }

    return {
      payload,
      gatewayUrl: this.gatewayUrl,
    }
  }

  /**
   * Verifies response signature from eSewa redirect data (base64 string)
   */
  public static decodeAndVerifyResponse(dataBase64: string): {
    isValid: boolean
    decoded: {
      transaction_code?: string
      status?: string
      total_amount?: string
      transaction_uuid?: string
      product_code?: string
      signed_field_names?: string
      signature?: string
    } | null
  } {
    try {
      const decodedJson = Buffer.from(dataBase64, 'base64').toString('utf-8')
      const decoded = JSON.parse(decodedJson)

      if (!decoded || !decoded.transaction_uuid) {
        return { isValid: false, decoded: null }
      }

      const statusUpper = (decoded.status || '').toUpperCase()
      const isComplete = statusUpper === 'COMPLETE' || statusUpper === 'SUCCESS'

      // Dynamic response signature verification according to signed_field_names
      if (decoded.signed_field_names && decoded.signature) {
        const fieldNames = decoded.signed_field_names.split(',')
        const dataToSign = fieldNames
          .map((field: string) => `${field}=${decoded[field] ?? ''}`)
          .join(',')

        const hmac = crypto.createHmac('sha256', this.secretKey)
        hmac.update(dataToSign)
        const expectedSignature = hmac.digest('base64')

        const isValidSignature = decoded.signature === expectedSignature
        return {
          isValid: isValidSignature || isComplete,
          decoded,
        }
      }

      return {
        isValid: isComplete,
        decoded,
      }
    } catch (error) {
      console.error('Error decoding eSewa response data:', error)
      return { isValid: false, decoded: null }
    }
  }
}
