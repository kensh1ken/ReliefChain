import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { DatabaseService } from '../database.service';
import { ReliefService } from '../relief.service';
import { allocationSchema, beneficiarySchema, fundSourceSchema } from '@reliefchain/contracts';
import { numbers } from './shared';

@Controller('operator') @UseGuards(JwtGuard) @Roles('GOVERNMENT', 'NGO')
export class OperatorController {
	constructor(private relief: ReliefService, private db: DatabaseService) {}
	@Get('context') async context(@Req() req: any) {
		const [d, s, f, a, b, p] = await Promise.all([this.db.query('SELECT * FROM disasters ORDER BY created_at'), this.db.query('SELECT * FROM schemes ORDER BY name'), this.db.query('SELECT * FROM fund_sources WHERE owner_msp=$1 ORDER BY created_at DESC', [req.user.orgMsp]), this.db.query('SELECT * FROM allocations WHERE owner_msp=$1 ORDER BY created_at DESC', [req.user.orgMsp]), this.db.query('SELECT id,beneficiary_ref,district_code,scheme_id,promised_paise,created_at FROM beneficiaries ORDER BY created_at DESC'), this.db.query(`SELECT d.*,a.owner_msp FROM disbursements d JOIN allocations a ON a.id=d.allocation_id WHERE a.owner_msp=$1 ORDER BY d.created_at DESC`, [req.user.orgMsp])]);
		return { disasters: d.rows, schemes: s.rows, sources: f.rows.map(numbers), allocations: a.rows.map(numbers), beneficiaries: b.rows.map(numbers), disbursements: p.rows.map(numbers) };
	}
	@Post('fund-sources') createSource(@Body() body: any, @Req() req: any) { return this.relief.createFundSource(fundSourceSchema.parse(body), req.user); }
	@Post('allocations') allocate(@Body() body: any, @Req() req: any) { return this.relief.allocate(allocationSchema.parse(body), req.user); }
	@Post('beneficiaries') beneficiary(@Body() body: any, @Req() req: any) { return this.relief.registerBeneficiary({ ...beneficiarySchema.parse(body), promisedPaise: body.promisedPaise }, req.user); }
	@Post('disbursements') disburse(@Body() body: any, @Req() req: any) { return this.relief.initiateDisbursement(body, req.user); }
	@Post('disbursements/:id/reverse') reverse(@Param('id') id: string, @Body() body: { reason: string }, @Req() req: any) { return this.relief.reverse(id, body.reason, req.user); }
}