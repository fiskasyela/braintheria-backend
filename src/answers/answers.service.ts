import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { IpfsService } from '../ipfs/ipfs.service';
import { HashingService } from '../hashing/hashing.service';
import { AnswerDto } from '../dto/answer.dto';
import { publish } from '../sse/sse.controller';

@Injectable()
export class AnswersService {
  constructor(
    private prisma: PrismaService,
    private ipfs: IpfsService,
    private hashing: HashingService,
  ) {}

  async create(qId: number, userId: number, dto: AnswerDto) {
    console.log('🟢 [AnswerService.create] called with:', { qId, userId });

    // --- Validate inputs ---
    if (!qId || isNaN(qId)) {
      throw new BadRequestException('Invalid question ID.');
    }
    if (!userId || isNaN(userId)) {
      throw new BadRequestException('Invalid user ID.');
    }
    if (!dto?.bodyMd || dto.bodyMd.trim().length === 0) {
      throw new BadRequestException('Answer body cannot be empty.');
    }

    // --- Find question ---
    const question = await this.prisma.question.findUnique({
      where: { id: qId },
      select: { id: true, authorId: true, status: true },
    });

    console.log('📘 Found question:', question);

    if (!question) {
      throw new NotFoundException('Question not found or already deleted.');
    }

    // --- Prevent self-answer ---
    if (Number(question.authorId) === Number(userId)) {
      console.warn('🚫 User attempted to answer own question', { qId, userId });
      throw new ForbiddenException('You cannot answer your own question.');
    }

    // --- Prevent answering closed/verified questions ---
    if (question.status !== 'Open') {
      console.warn('🔒 Attempt to answer non-open question:', {
        qId,
        status: question.status,
      });
      throw new BadRequestException('You can only answer open questions.');
    }

    // --- Prepare IPFS data ---
    console.log('📦 Computing content hash and uploading to IPFS...');
    const contentHash = this.hashing.computeContentHash(dto.bodyMd);
    const pinned = await this.ipfs.pinJson({
      questionId: qId,
      bodyMd: dto.bodyMd,
      files: dto.files || [],
    });

    console.log('📡 IPFS pinned successfully:', pinned);

    // --- Save to database ---
    console.log('💾 Creating answer in database...');
    const answer = await this.prisma.answer.create({
      data: {
        questionId: qId,
        authorId: userId,
        bodyMd: dto.bodyMd,
        ipfsCid: pinned.cid,
        contentHash,
      },
    });

    // --- Publish event for live updates ---
    publish('answer:created', { id: answer.id, questionId: qId });
    console.log('📢 Event published: answer:created', { answerId: answer.id });

    // --- Return structured response ---
    return {
      success: true,
      message: '✅ Answer created successfully.',
      data: {
        id: answer.id,
        questionId: qId,
        authorId: userId,
        ipfsCid: pinned.cid,
        createdAt: answer.createdAt,
      },
    };
  }
}
