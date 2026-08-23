import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtGuard } from './jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}
  @Post('login') login(@Body() body: { email: string; password: string }, @Req() req: any) { return this.auth.login(body.email, body.password, req.ip ?? body.email); }
  @Post('otp/request') requestOtp(@Body() body: { phone: string }, @Req() req: any) { return this.auth.requestOtp(body.phone, req.ip ?? body.phone); }
  @Post('otp/verify') verifyOtp(@Body() body: { phone: string; otp: string }, @Req() req: any) { return this.auth.verifyOtp(body.phone, body.otp, req.ip ?? body.phone); }
  @Post('refresh') refresh(@Body() body: { refreshToken: string }) { return this.auth.refresh(body.refreshToken); }
  @Post('logout') @UseGuards(JwtGuard) logout(@Req() req: any) { return this.auth.logout(req.headers.authorization.slice(7), req.user); }
}