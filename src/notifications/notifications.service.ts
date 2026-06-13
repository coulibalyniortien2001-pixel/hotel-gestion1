import { Injectable } from '@nestjs/common';
import { EmailService } from './channels/email.service';
import { SmsService } from './channels/sms.service';
import { SendEmailDto } from './dto/send-email.dto';
import { SendSmsDto } from './dto/send-sms.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {}

  sendEmail(dto: SendEmailDto): Promise<void> {
    return this.emailService.send(dto);
  }

  sendSms(dto: SendSmsDto): Promise<void> {
    return this.smsService.send(dto);
  }
}
