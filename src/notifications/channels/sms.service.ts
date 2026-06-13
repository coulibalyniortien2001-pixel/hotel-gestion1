import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';
import { SendSmsDto } from '../dto/send-sms.dto';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly client: twilio.Twilio;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.getOrThrow<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.getOrThrow<string>('TWILIO_AUTH_TOKEN');
    this.from = this.configService.getOrThrow<string>('TWILIO_PHONE_NUMBER');
    this.client = twilio(accountSid, authToken);
  }

  async send(dto: SendSmsDto): Promise<void> {
    const message = await this.client.messages.create({
      from: this.from,
      to: dto.to,
      body: dto.body,
    });

    this.logger.log(`SMS envoyé à ${dto.to} — SID: ${message.sid}`);
  }
}
