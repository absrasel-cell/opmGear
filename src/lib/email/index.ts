import { EmailProvider } from './types';
import { NoopProvider } from './providers/noop';
import { ResendProvider } from './providers/resend';

function createEmailProvider(): EmailProvider {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (resendApiKey) {
    try {
      return new ResendProvider(resendApiKey);
    } catch (error) {
      console.warn('Failed to initialize Resend provider, falling back to NOOP:', error);
      return new NoopProvider();
    }
  }
  
  return new NoopProvider();
}

export const emailProvider = createEmailProvider();