import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { IpfsService } from '../ipfs/ipfs.service';
import { HashingService } from '../hashing/hashing.service';
import { ChainReadService } from '../chain/chain-read.service';
import { publish } from '../sse/sse.controller';

@Injectable()
export class QuestionsService {
  constructor(
    private prisma: PrismaService,
    private ipfs: IpfsService,
    private hashing: HashingService,
    private chainRead: ChainReadService,
  ) {}

  async create(
    userId: number,
    dto: { title: string; bodyMd: string; files?: any[] },
  ) {
    const contentHash = this.hashing.computeContentHash(dto.bodyMd);
    const pinned = await this.ipfs.pinJson({
      title: dto.title,
      bodyMd: dto.bodyMd,
      files: dto.files || [],
    });

    const q = await this.prisma.question.create({
      data: {
        authorId: userId,
        title: dto.title,
        bodyMd: dto.bodyMd,
        ipfsCid: pinned.cid,
        contentHash,
      },
    });

    publish('question:created', { id: q.id });
    return {
      ...q,
      bountyWei: (await this.chainRead.bountyOf(q.id)).toString(),
    };
  }

  async getById(id: number) {
    const q = await this.prisma.question.findUnique({
      where: { id },
      include: {
        answers: {
          select: { id: true, authorId: true, isBest: true, contentHash: true },
        },
      },
    });
    if (!q) return null;
    const bounty = await this.chainRead.bountyOf(q.id);
    const bestAId = q.answers.find((a) => a.isBest)?.id || 0;
    return { ...q, bountyWei: bounty.toString(), bestAId };
  }

  list(authorId?: number) {
    return this.prisma.question.findMany({ where: { authorId } });
  }
}
