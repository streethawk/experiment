import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly ses: SESClient;
  private readonly from: string;
  private readonly appUrl: string;

  constructor(private readonly config: ConfigService) {
    const sesEndpoint = config.get<string>('aws.ses.endpoint');
    this.from    = config.get<string>('aws.ses.fromAddress') ?? 'noreply@carecore.co.uk';
    this.appUrl  = config.get<string>('APP_URL') ?? 'http://localhost:3001';

    this.ses = new SESClient({
      region: config.get<string>('aws.region') ?? 'eu-west-2',
      ...(sesEndpoint ? { endpoint: sesEndpoint } : {}),
    });
  }

  async sendPasswordReset(to: string, rawToken: string): Promise<void> {
    const link = `${this.appUrl}/reset-password?token=${rawToken}`;

    const html = `
      <p>Hi,</p>
      <p>We received a request to reset the password for your CareCore account.</p>
      <p>
        <a href="${link}" style="background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">
          Reset my password
        </a>
      </p>
      <p>This link expires in 60 minutes. If you did not request a reset, you can safely ignore this email.</p>
      <p>— The CareCore team</p>
    `;

    const text = `Reset your CareCore password:\n${link}\n\nThis link expires in 60 minutes.`;

    try {
      await this.ses.send(new SendEmailCommand({
        Source: this.from,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: 'Reset your CareCore password' },
          Body: {
            Html: { Data: html },
            Text: { Data: text },
          },
        },
      }));
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (err) {
      // Log but don't surface — prevents email enumeration via error responses
      this.logger.error(`Failed to send password reset email to ${to}`, err);
    }
  }
}
