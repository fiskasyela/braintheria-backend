import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { AskDto } from '../dto/ask.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('questions')
export class QuestionsController {
  constructor(private svc: QuestionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() body: AskDto,
    @Param() params: any,
    @Query() q: any,
    @Body() dto: AskDto,
    req?: any,
  ) {
    return this.svc.create(req.user.sub, dto);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.svc.getById(Number(id));
  }

  @Get()
  list(@Query('authorId') authorId?: string) {
    return this.svc.list(authorId ? Number(authorId) : undefined);
  }
}
