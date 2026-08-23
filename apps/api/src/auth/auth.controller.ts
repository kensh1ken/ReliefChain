import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}
  @Post('login') login(@Body() body: { email: string; password: string }) { return this.auth.login(body.email, body.password); }
  @Post('otp/request') requestOtp(@Body() body: { phone: string }) { return this.auth.requestOtp(body.phone); }
  @Post('otp/verify') verifyOtp(@Body() body: { phone: string; otp: string }) { return this.auth.verifyOtp(body.phone, body.otp); }
}