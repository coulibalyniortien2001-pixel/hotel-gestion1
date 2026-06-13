import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SendEmailDto } from '../dto/send-email.dto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.getOrThrow<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT', 587),
      secure: this.configService.get<string>('MAIL_SECURE') === 'true',
      auth: {
        user: this.configService.getOrThrow<string>('MAIL_USER'),
        pass: this.configService.getOrThrow<string>('MAIL_PASS'),
      },
    });
  }

  async send(dto: SendEmailDto): Promise<void> {
    const from = `"${this.configService.get<string>('MAIL_FROM_NAME', 'App')}" <${this.configService.getOrThrow<string>('MAIL_USER')}>`;

    await this.transporter.sendMail({
      from,
      to: dto.to,
      subject: dto.subject,
      html: dto.html,
      text: dto.text,
    });

    this.logger.log(`Email envoyé à ${dto.to} — sujet: "${dto.subject}"`);
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.logger.error('Connexion SMTP échouée', error);
      return false;
    }
  }
}
