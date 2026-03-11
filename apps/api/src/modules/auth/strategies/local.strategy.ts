import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string) {
    // validateCredentials throws typed errors — UnauthorizedException or AccountLockedException
    const result = await this.authService.validateCredentials(email, password);
    if (!result) throw new UnauthorizedException('Invalid email or password');
    return result;
  }
}
