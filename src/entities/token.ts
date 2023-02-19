import invariant from 'tiny-invariant'
import { ChainId } from '../constants'
import { validateAndParseAddress } from '../utils'
import { Currency } from './currency'

/**
 * Represents an ERC20 token with a unique address and some metadata.
 */
export class Token extends Currency {
  public readonly chainId: ChainId
  public readonly address: string

  public constructor(chainId: ChainId, address: string, decimals: number, symbol?: string, name?: string) {
    super(decimals, symbol, name)
    this.chainId = chainId
    this.address = validateAndParseAddress(address)
  }

  /**
   * Returns true if the two tokens are equivalent, i.e. have the same chainId and address.
   * @param other other token to compare
   */
  public equals(other: Token): boolean {
    // short circuit on reference equality
    if (this === other) {
      return true
    }
    return this.chainId === other.chainId && this.address === other.address
  }

  /**
   * Returns true if the address of this token sorts before the address of the other token
   * @param other other token to compare
   * @throws if the tokens have the same address
   * @throws if the tokens are on different chains
   */
  public sortsBefore(other: Token): boolean {
    invariant(this.chainId === other.chainId, 'CHAIN_IDS')
    invariant(this.address !== other.address, 'ADDRESSES')
    return this.address.toLowerCase() < other.address.toLowerCase()
  }
}

/**
 * Compares two currencies for equality
 */
export function currencyEquals(currencyA: Currency, currencyB: Currency): boolean {
  if (currencyA instanceof Token && currencyB instanceof Token) {
    return currencyA.equals(currencyB)
  } else if (currencyA instanceof Token) {
    return false
  } else if (currencyB instanceof Token) {
    return false
  } else {
    return currencyA === currencyB
  }
}

export const WETH = {
  [ChainId.MAINNET]:	new Token(ChainId.MAINNET,	'0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',	18,	'WMTV',	'Wrapped Ether'),
  [ChainId.ROPSTEN]:	new Token(ChainId.ROPSTEN,	'0xc778417E063141139Fce010982780140Aa0cD5Ab',	18,	'WETH',	'Wrapped Ether'),
  [ChainId.RINKEBY]:	new Token(ChainId.RINKEBY,	'0xc778417E063141139Fce010982780140Aa0cD5Ab',	18,	'WETH',	'Wrapped Ether'),
  [ChainId.GÖRLI]:		new Token(ChainId.GÖRLI,	'0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',	18,	'WETH',	'Wrapped Ether'),
  [ChainId.CRONOS]:		new Token(ChainId.CRONOS,	'0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23',	18,	'WCRO',	'Wrapped CRO'),
  [ChainId.KOVAN]:		new Token(ChainId.KOVAN,	'0xd0A1E359811322d97991E03f863a0C30C2cF029C',	18,	'WETH',	'Wrapped Ether'),
  [ChainId.BSC]:		new Token(ChainId.BSC,		'0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',	18,	'WBNB',	'Wrapped BNB'),
  [ChainId.XDAI]:		new Token(ChainId.XDAI,		'0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',	18,	'WXDAI','Wrapped XDAI'),
  [ChainId.MATIC]:		new Token(ChainId.MATIC,	'0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',	18,	'WMATIC','Wrapped Matic'),
  [ChainId.FANTOM]:		new Token(ChainId.FANTOM,	'0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83',	18,	'WFTM',	'Wrapped Fantom'),
  [ChainId.KCC]:		new Token(ChainId.KCC,		'0x4446Fc4eb47f2f6586f9fAAb68B3498F86C07521',	18,	'WKCS',	'Wrapped KCS'),
  [ChainId.ECHELON]:	new Token(ChainId.ECHELON,	'0xadEE5159f4f82a35B9068A6c810bdc6c599Ba6a8',	18,	'WECH',	'Wrapped Echelon'),
  [ChainId.MULTIVAC]:	new Token(ChainId.MULTIVAC,	'0x8E321596267a4727746b2F48BC8736DB5Da26977',	18,	'WMTV',	'Wrapped MTV'),
  [ChainId.MULTIVAC]:	new Token(ChainId.MULTIVAC,	'0xc86c7C0eFbd6A49B35E8714C5f59D99De09A225b',	18,	'WKAVA','Wrapped KAVA'),
  [ChainId.AVALANCHE]:	new Token(ChainId.AVALANCHE,'0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',	18,	'WAVAX','Wrapped AVAX')
}
