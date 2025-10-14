import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { IpfsService } from '../ipfs/ipfs.service';
import { HashingService } from '../hashing/hashing.service';
import { publish } from '../sse/sse.controller';

@Injectable()
export class AnswersService {
  constructor(
    private prisma: PrismaService,
    private ipfs: IpfsService,
    private hashing: HashingService,
  ) {}

  async create(
    questionId: number,
    userId: number,
    dto: { bodyMd: string; files?: any[] },
  ) {
    const contentHash = this.hashing.computeContentHash(dto.bodyMd);
    const pinned = await this.ipfs.pinJson({
      questionId,
      bodyMd: dto.bodyMd,
      files: dto.files || [],
    });

    const a = await this.prisma.answer.create({
      data: {
        questionId,
        authorId: userId,
        bodyMd: dto.bodyMd,
        ipfsCid: pinned.cid,
        contentHash,
      },
    });
    publish('answer:created', { id: a.id, questionId });
    return {
      id: a.id,
      ipfsCid: a.ipfsCid,
      contentHash: a.contentHash,
      chainAId: 0,
    };
  }
}
