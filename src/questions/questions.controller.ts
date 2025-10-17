import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { AskDto } from '../dto/ask.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UsersService } from 'src/users/users.service';

@Controller('questions')
export class QuestionsController {
  constructor(
    private svc: QuestionsService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: AskDto, @Request() req) {
    const user = await this.usersService.getById(req.user.sub);

    if (!user) {
      throw new BadRequestException('User not found.');
    }

    if (!user.primaryWallet) {
      throw new BadRequestException(
        'User wallet not connected. Please connect your wallet before posting a question with a bounty.',
      );
    }

    // Prepare a minimal object to send to the service
    const userQuestion = {
      id: user.id,
      walletAddress: user.primaryWallet,
    };

    return this.svc.create(userQuestion, dto);
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
