import { EAS, SchemaEncoder, SchemaRegistry } from '@ethereum-attestation-service/eas-sdk'
import { ethers } from 'ethers'

const addresses: any = {
  'mainnet': {
    schemaRegistryContractAddress: '0xA7b39296258348C78294F95B872b282326A97BDF',
    EASContractAddress: '0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587',
    schemaUID: '0x47a1041b689b790b4d3fa58ae2289a1d903dcc5b4e00d14f941090b59d947971'
  },
  'sepolia': {
    schemaRegistryContractAddress: '0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0',
    EASContractAddress: '0xC2679fBD37d54388Ce493F1DB75320D236e1815e', // Sepolia v0.26
    schemaUID: '0xd1a11316b53c1a3509a122f1b9a9994ea096468de475f165bb908507aaa36cd3'
  },
  'optimism-goerli': {
    schemaRegistryContractAddress: '0x4200000000000000000000000000000000000020',
    EASContractAddress: '0x4200000000000000000000000000000000000021',
    schemaUID: '0x6bec7c9280879206b1d21f35b6a9cc2b58725ad75bd5eaf1bde519257401dc44'
  },
  'optimism': {
    schemaRegistryContractAddress: '0x4200000000000000000000000000000000000020',
    EASContractAddress: '0x4200000000000000000000000000000000000021',
    schemaUID: '0x47a1041b689b790b4d3fa58ae2289a1d903dcc5b4e00d14f941090b59d947971'
  }
}

type CreateSchemaInput = {
  privateKey: string
  network: string
  rpcUrl: string
}

type AttestInput = {
  privateKey: string
  network: string
  rpcUrl: string
  repo: string
  branch: string
  username: string
  pullRequestLink: string
  pullRequestName: string
  pullRequestCount: number
}

export async function createSchema(input: CreateSchemaInput) {
  const { privateKey, network, rpcUrl } = input

  if (!privateKey) {
    throw new Error('privateKey is required')
  }

  if (!network) {
    throw new Error('network is required')
  }

  if (!rpcUrl) {
    throw new Error('rpcUrl is required')
  }

  const provider = new ethers.providers.StaticJsonRpcProvider(rpcUrl)

  const signer = new ethers.Wallet(privateKey, provider)
  const schemaRegistryContractAddress = addresses[network].schemaRegistryContractAddress
  if (!schemaRegistryContractAddress) {
    throw new Error(`schemaRegistryContractAddress is not available for network "${network}"`)
  }
  const schemaRegistry = new SchemaRegistry(schemaRegistryContractAddress)
  schemaRegistry.connect(signer)

  const schema = 'string username,string repository,string branch,string pullRequestName,string pullRequestLink,uint256 pullRequestCount'
   const resolverAddress = '0x0000000000000000000000000000000000000000'
  const revocable = true

  const tx = await schemaRegistry.register({
    schema,
    resolverAddress,
    revocable,
  })

  console.log('tx:', tx)
  await tx.wait()
  console.log('schema creation done')

  return tx
}

export async function attest(input : AttestInput) {
  const { privateKey, network, rpcUrl, repo, branch, username, pullRequestName, pullRequestLink, pullRequestCount } = input

  if (!privateKey) {
    throw new Error('privateKey is required')
  }

  if (!network) {
    throw new Error('network is required')
  }

  if (!rpcUrl) {
    throw new Error('rpcUrl is required')
  }

  if (!repo) {
    throw new Error('repo is required')
  }

  if (!branch) {
    throw new Error('branch is required')
  }

  if (!username) {
    throw new Error('username is required')
  }

  if (!pullRequestName) {
    throw new Error('pullRequestName is required')
  }

  if (!pullRequestLink) {
    throw new Error('pullRequestLink is required')
  }

  if (!pullRequestCount) {
    throw new Error('pullRequestCount is required')
  }


  const provider = new ethers.providers.StaticJsonRpcProvider(rpcUrl)
  const signer = new ethers.Wallet(privateKey, provider)
  
  const EASContractAddress = addresses[network].EASContractAddress
  if (!EASContractAddress) {
    throw new Error(`EASContractAddress is not available for network "${network}"`)
  }
  const eas = new EAS(EASContractAddress)
  eas.connect(signer)

  const schemaUID = addresses[network].schemaUID
  if (!schemaUID) {
    throw new Error(`schemaUID is not available for network "${network}"`)
  }

  // Initialize SchemaEncoder with the schema string
  const schemaEncoder = new SchemaEncoder('string username,string repository,string branch,string pullRequestName,string pullRequestLink,uint256 pullRequestCount')
  const encodedData = schemaEncoder.encodeData([
    { name: 'username', value: username, type: 'string' },
    { name: 'repository', value: repo, type: 'string' },
    { name: 'branch', value: branch, type: 'string' },
    { name: 'pullRequestName', value: pullRequestName, type: 'string' },
    { name: 'pullRequestLink', value: pullRequestLink, type: 'string' },
    { name: 'pullRequestCount', value: pullRequestCount, type: 'uint256' },
  ])

  const res = await eas.attest({
    schema: schemaUID,
    data: {
      recipient: '0x0000000000000000000000000000000000000000',
      expirationTime: 0,
      revocable: true,
      data: encodedData,
    },
  })

  const hash = res.tx.hash
  const newAttestationUID = await res.wait()

  return {
    hash,
    uid: newAttestationUID
  }
}

if (require.main === module) {
  require('dotenv').config()
  async function main() {
    const privateKey = process.env.PRIVATE_KEY
    const network = process.env.NETWORK
    const rpcUrl = process.env.RPC_URL

    if (privateKey && network && rpcUrl) {
      await createSchema({
        privateKey,
        network,
        rpcUrl,
      } as any)

      const result = await attest({
        privateKey,
        network,
        rpcUrl,
        username: 'example',
        repo: 'example',
        branch: 'main',
        pullRequestLink: 'www.github.com',
        pullRequestName: 'github test',
        pullRequestCount: 1
        
      } as any)
      console.log('result:', result)
    }
  }

  main().catch(console.error)
}
