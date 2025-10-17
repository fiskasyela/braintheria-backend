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
  Patch,
} from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { AskDto } from '../dto/ask.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UsersService } from 'src/users/users.service';
import { ChainReadService } from 'src/chain/chain-read.service';
import { UpdateQuestionDto } from '../dto/update-question.dto';

@Controller('questions')
export class QuestionsController {
  constructor(
    private svc: QuestionsService,
    private readonly usersService: UsersService,
    private readonly chainRead: ChainReadService,
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

    const userQuestion = {
      id: user.id,
      walletAddress: user.primaryWallet,
    };

    return this.svc.create(userQuestion, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyQuestions(@Request() req) {
    const user = await this.usersService.getById(req.user.sub);

    if (!user) {
      throw new BadRequestException('User not found.');
    }

    return this.svc.list(user.id);
  }

  @Get('chain')
  @UseGuards(JwtAuthGuard)
  async getAllChainQuestions() {
    return this.chainRead.listAllQuestions();
  }

  @Get('chain/:id')
  @UseGuards(JwtAuthGuard)
  async getChainQuestion(@Param('id') id: string) {
    return this.chainRead.getQuestion(Number(id));
  }

  @Get()
  async list() {
    return this.svc.list();
  }

  @Get('by-email')
  getByMail(@Query('email') email?: string) {
    return this.svc.listByMail(email);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getById(@Param('id') id: string) {
    return this.svc.getById(Number(id));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
    @Request() req,
  ) {
    const user = await this.usersService.getById(req.user.sub);

    if (!user) {
      throw new BadRequestException('User not found.');
    }

    const question = await this.svc.getById(Number(id));

    if (!question) {
      throw new BadRequestException('Question not found.');
    }

    if (question.authorId !== user.id) {
      throw new BadRequestException('You can only edit your own question.');
    }

    if (question.status === 'closed') {
      throw new BadRequestException(
        'Question is already closed and cannot be edited.',
      );
    }

    return this.svc.update(Number(id), dto);
  }
}
