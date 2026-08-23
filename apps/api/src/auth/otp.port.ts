export const OTP_PROVIDER = Symbol('OTP_PROVIDER');

export interface OtpProvider {
  issue(phone: string): Promise<string>;
}