import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { ReliefService } from '../relief.service';

@Controller('beneficiary') @UseGuards(JwtGuard) @Roles('BENEFICIARY')
export class BeneficiaryController {
	constructor(private relief: ReliefService) {}
	@Get('me') me(@Req() req: any) { return this.relief.beneficiaryView(req.user.beneficiaryId); }
}