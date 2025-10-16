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
  ) {
    // console.log('[AUTH CONTROLLER] initialized');
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // console.log('[ROUTE] /auth/google called → redirecting to Google consent');
    /* passport redirects */
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    // console.log('\n[CALLBACK] /auth/google/callback triggered');
    // console.log('[CALLBACK] query params:', req.query);

    // req.user set by GoogleStrategy.validate
    const guser = req.user as any; // { email, name }
    // console.log('[CALLBACK] req.user from strategy:', guser);

    if (!guser) {
      // console.error(
      //   '[CALLBACK ERROR] No user object on req.user. OAuth failed.',
      // );
      return res.status(401).json({ error: 'Google authentication failed.' });
    }

    try {
      // Create or validate the user in your DB
      // console.log('[CALLBACK] Validating or creating user in database...');
      const user = await this.auth.validateOrCreateUser(guser);
      // console.log('[CALLBACK] User record:', user);

      // Generate JWT for frontend use
      const payload = { id: user.id, email: user.email };
      const token = this.auth.sign(payload);
      // console.log('[CALLBACK] JWT created:', token.slice(0, 25) + '...');

      // Redirect to frontend with token
      const fe = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectURL = `${fe}/auth/callback?token=${token}`;
      // console.log('[CALLBACK] Redirecting user to:', redirectURL);

      return res.redirect(redirectURL);
    } catch (err) {
      // console.error('[CALLBACK ERROR] during validation:', err);
      return res
        .status(500)
        .json({ message: 'Server error during login', error: err.message });
    }
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
