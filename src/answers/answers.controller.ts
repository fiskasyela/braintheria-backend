import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AnswersService } from './answers.service';
import { AnswerDto } from '../dto/answer.dto';

@Controller('questions/:id/answers')
export class AnswersController {
  constructor(private svc: AnswersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Param('id') qId: string, @Body() dto: AnswerDto, @Req() req: any) {
    return this.svc.create(Number(qId), req.user.sub, dto);
  }
}
