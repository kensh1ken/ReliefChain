import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { JwtGuard } from './auth/jwt.guard';
import { MockOtpProvider } from './auth/mock-otp.provider';
import { OTP_PROVIDER } from './auth/otp.port';

@Module({
  imports: [JwtModule.register({ global: true, secret: process.env.JWT_SECRET, signOptions: { expiresIn: '8h', issuer: 'reliefchain' } })],
  controllers: [AuthController],
  providers: [AuthService, JwtGuard, MockOtpProvider, { provide: OTP_PROVIDER, useExisting: MockOtpProvider }],
  exports: [AuthService, JwtGuard]
})
export class AuthModule {}