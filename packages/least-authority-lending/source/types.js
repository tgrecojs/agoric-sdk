// @ts-check

/**
 * @typedef  {Object} AutoswapLocal
 * @property {(amount: Amount, brand: Brand) => Amount} getInputPrice
 * @property {() => Invitation} makeSwapInvitation
 */

/**
 * @typedef {Object} Collateral
 * @property {Ratio} initialMargin
 * @property {Ratio} liquidationMargin
 * @property {Ratio} stabilityFee
 * @property {Ratio} marketPrice
 * @property {Brand} brand
 */

/**
 * @typedef {Object} Rates
 * @property {Ratio} initialMargin minimum required over-collateralization
 * required to open a loan
 * @property {Ratio} liquidationMargin margin below which collateral will be
 * liquidated to satisfy the debt.
 * @property {Ratio} initialPrice price ratio of collateral to RUN
 * @property {Ratio} interestRate - annual interest rate charged on loans
 * @property {Ratio} loanFee The fee (in BasisPoints) charged when opening
 * or increasing a loan.
 */

/**
 * @typedef {Object} InnerVaultManager
 * @property {Brand} collateralBrand
 * @property {() => Ratio} getLiquidationMargin
 * @property {() => Ratio} getLoanFee
 * @property {() => Promise<PriceQuote>} getCollateralQuote
 * @property {() => Ratio} getInitialMargin
 * @property {() => Ratio} getInterestRate - The annual interest rate on a loan
 * @property {ReallocateReward} reallocateReward
 */

/**
 * @typedef {Object} LendingPoolManager
 * @property {(ZCFSeat) => Promise<LoanKit>}  makeLoanKit
 * @property {() => void} liquidateAll
 * @property {() => Ratio} getLiquidationMargin
 * @property {() => Ratio} getLoanFee
 * @property {() => Promise<PriceQuote>} getCollateralQuote
 * @property {() => Ratio} getInitialMargin
 * @property {() => Ratio} getInterestRate
 */
/**
 * @typedef {Object} OpenLoanKit
 * @property {Notifier<UIState>} notifier
 * @property {Promise<PaymentPKeywordRecord>} collateralPayoutP
 */

/**
 * @typedef {Object} Vault
 * @property {() => Promise<Invitation>} makeAdjustBalancesInvitation
 * @property {() => Promise<Invitation>} makeCloseInvitation
 * @property {() => Amount} getCollateralAmount
 * @property {() => Amount} getDebtAmount
 */

/**
 * @typedef {Object} LoanKit
 * @property {Vault} vault
 * @property {Promise<PaymentPKeywordRecord>} liquidationPayout
 * @property {Notifier<UIState>} uiNotifier
 */

/**
 * @typedef {Object} VaultKit
 * @property {Vault} vault
 * @property {(ZCFSeat) => Promise<OpenLoanKit>} openLoan
 * @property {(Timestamp) => Amount} accrueInterestAndAddToPool
 */

/**
 * @typedef {Object} LoanParams
 * @property {RelativeTime} chargingPeriod
 * @property {RelativeTime} recordingPeriod
 */

/**
 * @typedef {Object} LiquidationStrategy
 * @property {() => KeywordKeywordRecord} keywordMapping
 * @property {(Liquidity: Amount, RUN: Amount) => Proposal} makeProposal
 * @property {() => Promise<Invitation>} makeInvitation
 */

/**
 * @callback MakeLendingPoolManager
 * @param {ContractFacet} zcf
 * @param {ERef<AddLiquidityPublicFacet>} mintLendingPoolTokens
 * @param {ZCFMint} runMint
 * @param {Brand} collateralBrand
 * @param {ERef<PriceAuthority>} priceAuthority
 * @param {Rates} rates
 * @param {StageReward} rewardPoolStaging
 * @param {TimerService} timerService
 * @param {LoanParams} loanParams
 * @param {LiquidationStrategy} liquidationStrategy
 * @returns {LendingPoolManager}
 */

/**
 * @callback MakeVaultKit
 * @param {ContractFacet} zcf
 * @param {InnerVaultManager} manager
 * @param {ZCFMint} runMint
 * @param {ERef<MultipoolAutoswapPublicFacet>} autoswap
 * @param {ERef<PriceAuthority>} priceAuthority
 * @param {LoanParams} loanParams
 * @param {Timestamp} startTimeStamp
 * @returns {VaultKit}
 */

/**
 * @typedef UserSeatProperty
 * @property {ZCFSeat} userSeat
 *   The ZCFSeat representing the lender's position in the contract.
 */

/**
 *
 * @typedef {Object} LendingPoolConfig
 * @property {Brand} collateralType
 * @property {() => Promise<Invitation>} makeRemoveLiquidity
 * @property {ZCFMint} laTokenMint
 * @property {ZCFSeat} lenderSeat
 * @returns { LendingPoolConfig}
 */

/**
 * Allows holder to add collateral to the contract. Exits the seat
 * after adding.
 *
 * @callback MakeProvideLiquidity
 * @param {ContractFacet} zcf
 * @param {LendingPoolConfig} config
 * @returns {Promise<Invitation>} provideLiquidity
 */
