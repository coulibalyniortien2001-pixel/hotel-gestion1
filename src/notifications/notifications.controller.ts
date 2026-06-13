import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { SendEmailDto } from './dto/send-email.dto';
import { SendSmsDto } from './dto/send-sms.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Envoyer un email' })
  sendEmail(@Body() dto: SendEmailDto): Promise<void> {
    return this.notificationsService.sendEmail(dto);
  }

  @Post('sms')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Envoyer un SMS via Twilio' })
  sendSms(@Body() dto: SendSmsDto): Promise<void> {
    return this.notificationsService.sendSms(dto);
  }
}
