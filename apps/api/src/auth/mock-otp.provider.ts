import { Injectable } from '@nestjs/common';
import type { OtpProvider } from './otp.port';

@Injectable()
export class MockOtpProvider implements OtpProvider {
  async issue(_phone: string) {
    if (process.env.NODE_ENV === 'production' || !process.env.MOCK_OTP) throw new Error('Mock OTP delivery is available only outside production');
    return process.env.MOCK_OTP;
  }
}