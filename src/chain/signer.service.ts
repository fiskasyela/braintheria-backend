// signer.service.ts
import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { QNA_ABI } from './qna.abi';

@Injectable()
export class SignerService {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private contract: ethers.Contract;

  constructor() {
    //Connect to blockchain node
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

    //Load signer private key (server key)
    const privateKey = process.env.SERVER_SIGNER_PRIVATE_KEY;
    if (!privateKey)
      throw new Error('SERVER_SIGNER_PRIVATE_KEY missing in .env');
    this.signer = new ethers.Wallet(privateKey, this.provider);

    //Bind contract instance (deployed on Base Sepolia)
    const contractAddress = process.env.CONTRACT_ADDRESS;
    if (!contractAddress) throw new Error('CONTRACT_ADDRESS missing in .env');
    this.contract = new ethers.Contract(contractAddress, QNA_ABI, this.signer);
  }

  // Debug connection
  async testConnection() {
    const network = await this.provider.getNetwork();
    // console.log(`[SignerService] Connected to chain ${network.chainId}`);
    // console.log(
    //   `[SignerService] Using address: ${await this.signer.getAddress()}`,
    // );
  }

  getContract() {
    return this.contract;
  }

  // signer.service.ts
  async askQuestion(
    token: string,
    bountyEth: number,
    deadlineSeconds: number,
    uri: string,
  ) {
    // console.log(`[SignerService] Sending askQuestion()...`);

    // Convert bounty to wei (BigInt)
    const bountyWei = ethers.parseEther(bountyEth.toString());

    const tx = await this.contract.askQuestion(
      token, // address of token (use ethers.ZeroAddress for ETH)
      bountyWei, // bounty amount in wei
      deadlineSeconds, // deadline as uint40 (timestamp)
      uri, // metadata / question content (e.g., IPFS URL)
      { value: bountyWei }, // if payable (sending ETH bounty)
    );

    // console.log(`[SignerService] Tx sent: ${tx.hash}`);
    const receipt = await tx.wait();
    // console.log(`[SignerService] Tx confirmed in block ${receipt.blockNumber}`);
    return receipt;
  }

  async rewardUser(questionId: number, answererAddress: string) {
    // console.log(
    //   `[SignerService] Rewarding ${answererAddress} for question ${questionId}...`,
    // );
    const tx = await this.contract.rewardUser(
      BigInt(questionId),
      answererAddress,
    );
    // console.log(`[SignerService] Tx sent: ${tx.hash}`);
    const receipt = await tx.wait();
    // console.log(
    //   `[SignerService] Reward confirmed in block ${receipt.blockNumber}`,
    // );
    return receipt;
  }

  async answerQuestion(questionId: number, content: string) {
    // console.log(`[SignerService] Answering question ${questionId}...`);
    const tx = await this.contract.answerQuestion(BigInt(questionId), content);
    // console.log(`[SignerService] Tx sent: ${tx.hash}`);
    const receipt = await tx.wait();
    // console.log(`[SignerService] Tx confirmed in block ${receipt.blockNumber}`);
    return receipt;
  }

  // New: fundBounty
  async fundBounty(questionId: number, amountWei: bigint) {
    // console.log(
    //   `[SignerService] Funding bounty for Q${questionId} with ${amountWei} wei`,
    // );

    // If your Solidity function is payable (like: function fundBounty(uint256 _qId) external payable)
    const tx = await this.contract.fundBounty(BigInt(questionId), {
      value: amountWei, // send ETH along
    });

    // console.log(`[SignerService] Tx sent: ${tx.hash}`);
    const receipt = await tx.wait();
    // console.log(
    //   `[SignerService] Fund confirmed in block ${receipt.blockNumber}`,
    // );

    return receipt.transactionHash;
  }
}
