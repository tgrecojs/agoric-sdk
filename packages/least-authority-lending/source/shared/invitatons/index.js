
const makeLendingPool = async(zcf, )
const invitation = zcf.makeInvitation(myOfferHandler, 'myInvitation');
const m = brand => `la${brand}`
const makeLendingPool = async (
    zcf,
    manager,
    lendingPoolIssuer,
    priceAuthority,
    loanParams,
    startTimeStamp,
  ) => {
 
  const {collateralBrand, lendingPoolIssuer } = manager.depositPayment;
  // timestamp of most recent update to interest
  let latestInterestUpdate = startTimeStamp;

  // vaultSeat will hold the collateral until the loan is retired. The
  // payout from it will be handed to the user: if the vault dies early
  // (because the StableCoinMachine vat died), they'll get all their
  // collateral back. If that happens, the issuer for the RUN will be dead,
  // so their loan will be worthless.
  const { zcfSeat: poolSeat, userSeat } = zcf.makeEmptySeatKit();

  trace('vaultSeat proposal', vaultSeat.getProposal());
  trace('vaultSeat::', vaultSeat);

  const { brand: laTokenBrand } = laTokenMint.getIssuerRecord();
  const len = AmountMath.make(lendingPoolIssuer.brand);

  const depositCollateral  = async (seat) => {
      const proposal = 
    assert(AmountMath.isEmpty(runDebt), X`vault must be empty initially`);
    // get the payout to provide access to the collateral if the
    // contract abandons
    const {
      give: { Liquidity: collateralAmount },
      want: { PoolToken: _laToken },
    } = seat.getProposal();

    const collateralPayoutP = E(userSeat).getPayouts();
  
  }



  const transferCollateral = fromSeat => (toSeat) => {
    const { give, want } = fromSeat.getProposal();
    toSeat.incrementBy(
        fromSeat.decrementBy({ LaToken: want.LaToken })
    )

    fromSeat.incrementBy(
        toSeat.incrementBy({ Liquidity: give.Collateral })
    )
  }



})