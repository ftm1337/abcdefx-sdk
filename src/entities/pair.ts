import { Price } from './fractions/price'
import { TokenAmount } from './fractions/tokenAmount'
import invariant from 'tiny-invariant'
import JSBI from 'jsbi'
import { pack, keccak256 } from '@ethersproject/solidity'
import { getCreate2Address } from '@ethersproject/address'

import {
  BigintIsh,
  FACTORY_ADDRESS,
  INIT_CODE_HASH,
  MINIMUM_LIQUIDITY,
  ZERO,
  ONE,
  FIVE,
  _997,
  _1000,
  ChainId
} from '../constants'
import { sqrt, parseBigintIsh } from '../utils'
import { InsufficientReservesError, InsufficientInputAmountError } from '../errors'
import { Token } from './token'

let PAIR_ADDRESS_CACHE: { [token0Address: string]: { [token1Address: string]: string } } = {}











export class Pair {
  public readonly liquidityToken: Token
  private readonly tokenAmounts: [TokenAmount, TokenAmount]

  public static getAddress(tokenA: Token, tokenB: Token): string {
    const tokens = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA] // does safety checks

    if (PAIR_ADDRESS_CACHE?.[tokens[0].address]?.[tokens[1].address] === undefined) {
      PAIR_ADDRESS_CACHE = {
        ...PAIR_ADDRESS_CACHE,
        [tokens[0].address]: {
          ...PAIR_ADDRESS_CACHE?.[tokens[0].address],
          [tokens[1].address]: getCreate2Address(
            FACTORY_ADDRESS,
            keccak256(['bytes'], [pack(['address', 'address'], [tokens[0].address, tokens[1].address])]),
            INIT_CODE_HASH
          )
        }
      }
    }

    return PAIR_ADDRESS_CACHE[tokens[0].address][tokens[1].address]
  }

  public constructor(tokenAmountA: TokenAmount, tokenAmountB: TokenAmount) {
    const tokenAmounts = tokenAmountA.token.sortsBefore(tokenAmountB.token) // does safety checks
      ? [tokenAmountA, tokenAmountB]
      : [tokenAmountB, tokenAmountA]
    this.liquidityToken = new Token(
      tokenAmounts[0].token.chainId,
      Pair.getAddress(tokenAmounts[0].token, tokenAmounts[1].token),
      18,
      'UNI-V2',
      'Uniswap V2'
    )
    this.tokenAmounts = tokenAmounts as [TokenAmount, TokenAmount]
  }

  /**
   * Returns true if the token is either token0 or token1
   * @param token to check
   */
  public involvesToken(token: Token): boolean {
    return token.equals(this.token0) || token.equals(this.token1)
  }

  /**
   * Returns the current mid price of the pair in terms of token0, i.e. the ratio of reserve1 to reserve0
   */
  public get token0Price(): Price {
    return new Price(this.token0, this.token1, this.tokenAmounts[0].raw, this.tokenAmounts[1].raw)
  }

  /**
   * Returns the current mid price of the pair in terms of token1, i.e. the ratio of reserve0 to reserve1
   */
  public get token1Price(): Price {
    return new Price(this.token1, this.token0, this.tokenAmounts[1].raw, this.tokenAmounts[0].raw)
  }

  /**
   * Return the price of the given token in terms of the other token in the pair.
   * @param token token to return price of
   */
  public priceOf(token: Token): Price {
    invariant(this.involvesToken(token), 'TOKEN')
    return token.equals(this.token0) ? this.token0Price : this.token1Price
  }

  /**
   * Returns the chain ID of the tokens in the pair.
   */
  public get chainId(): ChainId {
    return this.token0.chainId
  }

  public get token0(): Token {
    return this.tokenAmounts[0].token
  }

  public get token1(): Token {
    return this.tokenAmounts[1].token
  }

  public get reserve0(): TokenAmount {
    return this.tokenAmounts[0]
  }

  public get reserve1(): TokenAmount {
    return this.tokenAmounts[1]
  }

  public reserveOf(token: Token): TokenAmount {
    invariant(this.involvesToken(token), 'TOKEN')
    return token.equals(this.token0) ? this.reserve0 : this.reserve1
  }






	///////////////////////////
	///    @_SolidlyLib		///
	///////////////////////////


    function _SolidlyLib_k(x: number, y: number, _d0: number, _d1: number) {
        let _x = x * 1e18 / _d0;
        let _y = y * 1e18 / _d1;
        let _a = (_x * _y) / 1e18;
        let _b = ((_x * _x) / 1e18 + (_y * _y) / 1e18);
        return _a * _b / 1e18;  // x3y+y3x >= k
    }

    function _SolidlyLib_f(x0: number, y: number) {
        return x0*(y*y/1e18*y/1e18)/1e18+(x0*x0/1e18*x0/1e18)*y/1e18;
    }

    function _SolidlyLib_d( x0: number, y: number) {
        return 3*x0*(y*y/1e18)/1e18+(x0*x0/1e18*x0/1e18);
    }

    function _SolidlyLib_get_y( x0: number,  xy: number,  y: number)  {
        for ( let i = 0; i < 255; i++) {
            let y_prev = y;
            let k = _SolidlyLib_f(x0, y);
            if (k < xy) {
                 let dy = (xy - k)*1e18/_SolidlyLib_d(x0, y);
                y = y + dy;
            } else {
                 let dy = (k - xy)*1e18/_SolidlyLib_d(x0, y);
                y = y - dy;
            }
            if (y > y_prev) {
                if (y - y_prev <= 1) {
                    return y;
                }
            } else {
                if (y_prev - y <= 1) {
                    return y;
                }
            }
        }
        return y;
    }

	///////////////////////////
	///    _SolidlyLib ^	///
	///////////////////////////








  public getOutputAmount(inputAmount: TokenAmount): [TokenAmount, Pair] {
    invariant(this.involvesToken(inputAmount.token), 'TOKEN')
    if (JSBI.equal(this.reserve0.raw, ZERO) || JSBI.equal(this.reserve1.raw, ZERO)) {
      throw new InsufficientReservesError()
    }
    const inputReserve = this.reserveOf(inputAmount.token)
    const outputReserve = this.reserveOf(inputAmount.token.equals(this.token0) ? this.token1 : this.token0)
    const inputAmountWithFee = JSBI.multiply(inputAmount.raw, _996)

	let _SolidlyLib_tokenOut = inputAmount.token.equals(this.token0) ? this.token1 : this.token0;

    const decimalsIn = JSBI.exponentiate(10, inputAmount.token.decimals);
    const decimalsOut = JSBI.exponentiate(10, _SolidlyLib_tokenOut.decimals);


    ///function _SolidlyLib_getAmountOut(amountIn: number, tokenIn: any, _reserve0: number, _reserve1: number) {
    	///	Assumes amountIn to be deducted by fee
        let xy =  _SolidlyLib_k(inputReserve, outputReserve, decimalsIn, decimalsOut);
        let reserveInAdj = JSBI.divide( JSBI.multiply(inputReserve, 1e18), decimalsIn) ;
        let reserveOutAdj = JSBI.divide( JSBI.multiply(outputReserve, 1e18), decimalsOut) ;
        amountInAdj = JSBI.divide( JSBI.multiply(inputAmountWithFee, 1e18), decimalsIn) ;
        let y = reserveOutAdj - _SolidlyLib_get_y(amountInAdj+reserveInAdj, xy, reserveOutAdj);
        const _tokenOutAmount = JSBI.divide( JSBI.multiply(y, decimalsOut) , 1e18 );
    ///}



    ///const numerator = JSBI.multiply(inputAmountWithFee, outputReserve.raw)
    ///const denominator = JSBI.add(JSBI.multiply(inputReserve.raw, _1000), inputAmountWithFee)



    const outputAmount = new TokenAmount(
      inputAmount.token.equals(this.token0) ? this.token1 : this.token0,
      _tokenOutAmount
      ///JSBI.divide(numerator, denominator)
    )
    if (JSBI.equal(outputAmount.raw, ZERO)) {
      throw new InsufficientInputAmountError()
    }
    return [outputAmount, new Pair(inputReserve.add(inputAmount), outputReserve.subtract(outputAmount))]
  }

  public getInputAmount(outputAmount: TokenAmount): [TokenAmount, Pair] {
    invariant(this.involvesToken(outputAmount.token), 'TOKEN')
    if (
      JSBI.equal(this.reserve0.raw, ZERO) ||
      JSBI.equal(this.reserve1.raw, ZERO) ||
      JSBI.greaterThanOrEqual(outputAmount.raw, this.reserveOf(outputAmount.token).raw)
    ) {
      throw new InsufficientReservesError()
    }

    const outputReserve = this.reserveOf(outputAmount.token)
    const inputReserve = this.reserveOf(outputAmount.token.equals(this.token0) ? this.token1 : this.token0)
    const numerator = JSBI.multiply(JSBI.multiply(inputReserve.raw, outputAmount.raw), _1000)
    const denominator = JSBI.multiply(JSBI.subtract(outputReserve.raw, outputAmount.raw), _997)
    const inputAmount = new TokenAmount(
      outputAmount.token.equals(this.token0) ? this.token1 : this.token0,
      JSBI.add(JSBI.divide(numerator, denominator), ONE)
    )
    return [inputAmount, new Pair(inputReserve.add(inputAmount), outputReserve.subtract(outputAmount))]
  }

  public getLiquidityMinted(
    totalSupply: TokenAmount,
    tokenAmountA: TokenAmount,
    tokenAmountB: TokenAmount
  ): TokenAmount {
    invariant(totalSupply.token.equals(this.liquidityToken), 'LIQUIDITY')
    const tokenAmounts = tokenAmountA.token.sortsBefore(tokenAmountB.token) // does safety checks
      ? [tokenAmountA, tokenAmountB]
      : [tokenAmountB, tokenAmountA]
    invariant(tokenAmounts[0].token.equals(this.token0) && tokenAmounts[1].token.equals(this.token1), 'TOKEN')

    let liquidity: JSBI
    if (JSBI.equal(totalSupply.raw, ZERO)) {
      liquidity = JSBI.subtract(sqrt(JSBI.multiply(tokenAmounts[0].raw, tokenAmounts[1].raw)), MINIMUM_LIQUIDITY)
    } else {
      const amount0 = JSBI.divide(JSBI.multiply(tokenAmounts[0].raw, totalSupply.raw), this.reserve0.raw)
      const amount1 = JSBI.divide(JSBI.multiply(tokenAmounts[1].raw, totalSupply.raw), this.reserve1.raw)
      liquidity = JSBI.lessThanOrEqual(amount0, amount1) ? amount0 : amount1
    }
    if (!JSBI.greaterThan(liquidity, ZERO)) {
      throw new InsufficientInputAmountError()
    }
    return new TokenAmount(this.liquidityToken, liquidity)
  }

  public getLiquidityValue(
    token: Token,
    totalSupply: TokenAmount,
    liquidity: TokenAmount,
    feeOn: boolean = false,
    kLast?: BigintIsh
  ): TokenAmount {
    invariant(this.involvesToken(token), 'TOKEN')
    invariant(totalSupply.token.equals(this.liquidityToken), 'TOTAL_SUPPLY')
    invariant(liquidity.token.equals(this.liquidityToken), 'LIQUIDITY')
    invariant(JSBI.lessThanOrEqual(liquidity.raw, totalSupply.raw), 'LIQUIDITY')

    let totalSupplyAdjusted: TokenAmount
    if (!feeOn) {
      totalSupplyAdjusted = totalSupply
    } else {
      invariant(!!kLast, 'K_LAST')
      const kLastParsed = parseBigintIsh(kLast)
      if (!JSBI.equal(kLastParsed, ZERO)) {
        const rootK = sqrt(JSBI.multiply(this.reserve0.raw, this.reserve1.raw))
        const rootKLast = sqrt(kLastParsed)
        if (JSBI.greaterThan(rootK, rootKLast)) {
          const numerator = JSBI.multiply(totalSupply.raw, JSBI.subtract(rootK, rootKLast))
          const denominator = JSBI.add(JSBI.multiply(rootK, FIVE), rootKLast)
          const feeLiquidity = JSBI.divide(numerator, denominator)
          totalSupplyAdjusted = totalSupply.add(new TokenAmount(this.liquidityToken, feeLiquidity))
        } else {
          totalSupplyAdjusted = totalSupply
        }
      } else {
        totalSupplyAdjusted = totalSupply
      }
    }

    return new TokenAmount(
      token,
      JSBI.divide(JSBI.multiply(liquidity.raw, this.reserveOf(token).raw), totalSupplyAdjusted.raw)
    )
  }
}
































    /*
    **********************************
    **********************************
    **********************************
    function getAmountOut(uint amountIn, address tokenIn) external view returns (uint) {
        (uint _reserve0, uint _reserve1) = (reserve0, reserve1);
        amountIn -= amountIn / fee; // remove fee from amount received
        return _getAmountOut(amountIn, tokenIn, _reserve0, _reserve1);
    }

    function _getAmountOut(uint amountIn, address tokenIn, uint _reserve0, uint _reserve1) internal view returns (uint) {
        uint xy =  _k(_reserve0, _reserve1);
        _reserve0 = _reserve0 * 1e18 / decimals0;
        _reserve1 = _reserve1 * 1e18 / decimals1;
        (uint reserveA, uint reserveB) = tokenIn == token0 ? (_reserve0, _reserve1) : (_reserve1, _reserve0);
        amountIn = tokenIn == token0 ? amountIn * 1e18 / decimals0 : amountIn * 1e18 / decimals1;
        uint y = reserveB - _get_y(amountIn+reserveA, xy, reserveB);
        return y * (tokenIn == token0 ? decimals1 : decimals0) / 1e18;
    }

    function _k(uint x, uint y) internal view returns (uint) {
        uint _x = x * 1e18 / decimals0;
        uint _y = y * 1e18 / decimals1;
        uint _a = (_x * _y) / 1e18;
        uint _b = ((_x * _x) / 1e18 + (_y * _y) / 1e18);
        return _a * _b / 1e18;  // x3y+y3x >= k
    }

    function _f(uint x0, uint y) internal pure returns (uint) {
        return x0*(y*y/1e18*y/1e18)/1e18+(x0*x0/1e18*x0/1e18)*y/1e18;
    }

    function _d(uint x0, uint y) internal pure returns (uint) {
        return 3*x0*(y*y/1e18)/1e18+(x0*x0/1e18*x0/1e18);
    }

    function _get_y(uint x0, uint xy, uint y) internal pure returns (uint) {
        for (uint i = 0; i < 255; i++) {
            uint y_prev = y;
            uint k = _f(x0, y);
            if (k < xy) {
                uint dy = (xy - k)*1e18/_d(x0, y);
                y = y + dy;
            } else {
                uint dy = (k - xy)*1e18/_d(x0, y);
                y = y - dy;
            }
            if (y > y_prev) {
                if (y - y_prev <= 1) {
                    return y;
                }
            } else {
                if (y_prev - y <= 1) {
                    return y;
                }
            }
        }
        return y;
    }
    **********************************
    **********************************
    **********************************

const reserve0 = 100e18;
const reserve1 = 90e18;
const decimals0 = 1e18;
const decimals1 = 1e18;
const fee = 5;
const token0 = null;
const token1 = null;
function _SolidlyLibgetAmountOut(amountIn, tokenIn) {
    let _reserve0 = reserve0;
    let _reserve1 = reserve1;
    amountIn -= amountIn / fee; // remove fee from amount received
    return _SolidlyLib_getAmountOut(amountIn, tokenIn, _reserve0, _reserve1);
}
function _SolidlyLib_getAmountOut(amountIn, tokenIn, _reserve0, _reserve1) {
    let xy = _SolidlyLib_k(_reserve0, _reserve1);
    _reserve0 = _reserve0 * 1e18 / decimals0;
    _reserve1 = _reserve1 * 1e18 / decimals1;
    let reserveA = tokenIn == token0 ? _reserve0 : _reserve1;
    let reserveB = tokenIn == token0 ? _reserve1 : _reserve0;
    amountIn = tokenIn == token0 ? amountIn * 1e18 / decimals0 : amountIn * 1e18 / decimals1;
    let y = reserveB - _SolidlyLib_get_y(amountIn + reserveA, xy, reserveB);
    return y * (tokenIn == token0 ? decimals1 : decimals0) / 1e18;
}
function _SolidlyLib_k(x, y) {
    let _x = x * 1e18 / decimals0;
    let _y = y * 1e18 / decimals1;
    let _a = (_x * _y) / 1e18;
    let _b = ((_x * _x) / 1e18 + (_y * _y) / 1e18);
    return _a * _b / 1e18; // x3y+y3x >= k
}
function _SolidlyLib_f(x0, y) {
    return x0 * (y * y / 1e18 * y / 1e18) / 1e18 + (x0 * x0 / 1e18 * x0 / 1e18) * y / 1e18;
}
function _SolidlyLib_d(x0, y) {
    return 3 * x0 * (y * y / 1e18) / 1e18 + (x0 * x0 / 1e18 * x0 / 1e18);
}
function _SolidlyLib_get_y(x0, xy, y) {
    for (let i = 0; i < 255; i++) {
        let y_prev = y;
        let k = _SolidlyLib_f(x0, y);
        if (k < xy) {
            let dy = (xy - k) * 1e18 / _SolidlyLib_d(x0, y);
            y = y + dy;
        }
        else {
            let dy = (k - xy) * 1e18 / _SolidlyLib_d(x0, y);
            y = y - dy;
        }
        if (y > y_prev) {
            if (y - y_prev <= 1) {
                return y;
            }
        }
        else {
            if (y_prev - y <= 1) {
                return y;
            }
        }
    }
    return y;
}

    **********************************
    **********************************
    **********************************

const reserve0=100e18;
const reserve1=90e18;
const decimals0=1e18;
const decimals1=1e18;
const fee=5;
const token0: any = null;
const token1: any = null;

    function _SolidlyLibgetAmountOut(amountIn: number,  tokenIn: any) {
        let _reserve0 = reserve0;
        let _reserve1 = reserve1;
        amountIn -= amountIn / fee; // remove fee from amount received
        return _SolidlyLib_getAmountOut(amountIn, tokenIn, _reserve0, _reserve1);
    }

    function _SolidlyLib_getAmountOut(amountIn: number, tokenIn: any, _reserve0: number, _reserve1: number) {
        let xy =  _SolidlyLib_k(_reserve0, _reserve1);
        _reserve0 = _reserve0 * 1e18 / decimals0;
        _reserve1 = _reserve1 * 1e18 / decimals1;
        let reserveA = tokenIn == token0 ? _reserve0 : _reserve1;
        let reserveB = tokenIn == token0 ? _reserve1 : _reserve0;
        amountIn = tokenIn == token0 ? amountIn * 1e18 / decimals0 : amountIn * 1e18 / decimals1;
        let y = reserveB - _SolidlyLib_get_y(amountIn+reserveA, xy, reserveB);
        return y * (tokenIn == token0 ? decimals1 : decimals0) / 1e18;
    }

    function _SolidlyLib_k(x: number, y: number) {
        let _x = x * 1e18 / decimals0;
        let _y = y * 1e18 / decimals1;
        let _a = (_x * _y) / 1e18;
        let _b = ((_x * _x) / 1e18 + (_y * _y) / 1e18);
        return _a * _b / 1e18;  // x3y+y3x >= k
    }

    function _SolidlyLib_f(x0: number, y: number) {
        return x0*(y*y/1e18*y/1e18)/1e18+(x0*x0/1e18*x0/1e18)*y/1e18;
    }

    function _SolidlyLib_d( x0: number, y: number) {
        return 3*x0*(y*y/1e18)/1e18+(x0*x0/1e18*x0/1e18);
    }

    function _SolidlyLib_get_y( x0: number,  xy: number,  y: number)  {
        for ( let i = 0; i < 255; i++) {
            let y_prev = y;
            let k = _SolidlyLib_f(x0, y);
            if (k < xy) {
                 let dy = (xy - k)*1e18/_SolidlyLib_d(x0, y);
                y = y + dy;
            } else {
                 let dy = (k - xy)*1e18/_SolidlyLib_d(x0, y);
                y = y - dy;
            }
            if (y > y_prev) {
                if (y - y_prev <= 1) {
                    return y;
                }
            } else {
                if (y_prev - y <= 1) {
                    return y;
                }
            }
        }
        return y;
    }


    **********************************
    **********************************
    **********************************
    */
