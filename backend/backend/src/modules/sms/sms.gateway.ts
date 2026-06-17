import axios from 'axios';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export interface SmsResult {
  success: boolean;
  messageId?: string;
  response?: unknown;
  error?: string;
}

export async function sendSms(phone: string, message: string): Promise<SmsResult> {
  if (env.NODE_ENV !== 'production') {
    logger.info(`[SMS MOCK] To: ${phone} | Message: ${message}`);
    return { success: true, messageId: `mock-${Date.now()}` };
  }

  try {
    // Africa's Talking gateway
    const response = await axios.post(
      'https://api.africastalking.com/version1/messaging',
      new URLSearchParams({
        username: env.AT_USERNAME,
        to: phone,
        message,
        from: env.AT_SENDER_ID,
      }).toString(),
      {
        headers: {
          'apiKey': env.AT_API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        timeout: 10000,
      }
    );

    const recipients = response.data?.SMSMessageData?.Recipients;
    if (recipients && recipients.length > 0) {
      const recipient = recipients[0];
      if (recipient.status === 'Success') {
        return { success: true, messageId: recipient.messageId, response: response.data };
      }
      return { success: false, error: recipient.status, response: response.data };
    }
    return { success: false, error: 'No recipients in response', response: response.data };
  } catch (err: any) {
    logger.error('SMS send error:', err.message);
    return { success: false, error: err.message };
  }
}

export function interpolateTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
}