import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { IpfsService } from '../ipfs/ipfs.service';
import { HashingService } from '../hashing/hashing.service';
import { publish } from '../sse/sse.controller';
import { ChainReadService } from 'src/chain/chain-read.service';
import { SignerService } from 'src/chain/signer.service';

@Injectable()
export class QuestionsService {
  constructor(
    private prisma: PrismaService,
    private ipfs: IpfsService,
    private hashing: HashingService,
    private chainRead: ChainReadService,
    private signerService: SignerService,
  ) {}

  // Create question + send on-chain tx (optional bounty)
  async create(
    user: { id: number; walletAddress: string },
    dto: { title: string; bodyMd: string; bounty?: number; files?: any[] },
  ) {
    // Prepare content hash + IPFS
    const contentHash = this.hashing.computeContentHash(dto.bodyMd);
    const pinned = await this.ipfs.pinJson({
      title: dto.title,
      bodyMd: dto.bodyMd,
      files: dto.files || [],
    });

    //Optional bounty check
    const bounty = dto.bounty || 0;
    if (bounty > 0) {
      const balanceStr = await this.chainRead.getEthBalance(user.walletAddress);
      const balance = parseFloat(balanceStr);
      if (balance < bounty) {
        throw new BadRequestException(
          `Insufficient balance. You have ${balance} ETH, need ${bounty} ETH.`,
        );
      }
    }

    // 3️⃣ Store question in DB (temporary)
    const question = await this.prisma.question.create({
      data: {
        authorId: user.id,
        title: dto.title,
        bodyMd: dto.bodyMd,
        ipfsCid: pinned.cid,
        contentHash,
      },
    });

    // Send blockchain transaction if bounty > 0
    let txHash: string | null = null;
    if (bounty > 0) {
      try {
        const tx = await this.signerService.askQuestion(
          user.walletAddress,
          dto.title,
          bounty,
        );
        txHash = tx.hash;
      } catch (error) {
        console.error('Error sending askQuestion tx:', error);
        throw new BadRequestException('Failed to send askQuestion transaction');
      }
    }

    // Update question with tx hash (if exists)
    const updated = await this.prisma.question.update({
      where: { id: question.id },
      data: { txHash },
    });

    //Publish event for SSE clients
    publish('question:created', { id: updated.id });

    // 7Fetch current bounty (read from blockchain)
    const bountyWei = (await this.chainRead.bountyOf(updated.id)).toString();

    return { ...updated, bountyWei };
  }

  //Get question by ID
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

  // List questions (optionally by author)
  list(authorId?: number) {
    return this.prisma.question.findMany({
      where: authorId ? { authorId } : {},
      orderBy: { createdAt: 'desc' },
    });
  }
}
