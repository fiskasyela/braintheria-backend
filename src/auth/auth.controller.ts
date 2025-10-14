import {
  Controller,
  Get,
  Req,
  Res,
  UseGuards,
  Post,
  Body,
  Patch,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private users: UsersService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    /* passport redirects */
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    // req.user set by GoogleStrategy.validate
    const guser = req.user as any; // { email, name }
    const user = await this.auth.validateOrCreateUser(guser);
    const token = this.auth.sign({ id: user.id, email: user.email });

    // Redirect back to frontend with token, or set cookie
    const fe = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${fe}/auth/callback?token=${token}`);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: any) {
    const userId = req.user.sub;
    return this.users.getById(userId);
  }

  @Patch('me/wallet')
  @UseGuards(JwtAuthGuard)
  async setWallet(@Req() req: any, @Body() body: { address: string }) {
    return this.users.setPrimaryWallet(req.user.sub, body.address);
  }
}
