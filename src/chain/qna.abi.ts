export const QNA_ABI = [
  {
    type: 'function',
    name: 'askQuestion',
    stateMutability: 'payable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'bounty', type: 'uint256' },
      { name: 'deadline', type: 'uint40' },
      { name: 'uri', type: 'string' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'answerQuestion',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'questionId', type: 'uint256' },
      { name: 'uri', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'acceptAnswer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'questionId', type: 'uint256' },
      { name: 'answerId', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getQuestion',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [
      {
        components: [
          { name: 'asker', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'bounty', type: 'uint256' },
          { name: 'deadline', type: 'uint40' },
          { name: 'uri', type: 'string' },
          { name: 'answered', type: 'bool' },
        ],
        type: 'tuple',
      },
    ],
  },
  {
    type: 'function',
    name: 'fundBounty',
    stateMutability: 'payable',
    inputs: [{ name: 'qId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'bountyOf',
    stateMutability: 'view',
    inputs: [{ name: 'qId', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;
