# Snapshot report for `test/swingsetTests/zoe/zoe.test.js`

The actual snapshot is saved in `zoe.test.js.snap`.

Generated by [AVA](https://avajs.dev).

## zoe - automaticRefund - valid inputs

> Snapshot 1

    [
      '=> alice and bob are set up',
      '=> alice.doCreateAutomaticRefund called',
      'The offer was accepted',
      'The offer was accepted',
      'bobMoolaPurse: balance {"brand":{},"value":0}',
      'bobSimoleanPurse: balance {"brand":{},"value":17}',
      'aliceMoolaPurse: balance {"brand":{},"value":3}',
      'aliceSimoleanPurse: balance {"brand":{},"value":0}',
    ]

## zoe - coveredCall - valid inputs

> Snapshot 1

    [
      '=> alice and bob are set up',
      '=> alice.doCreateCoveredCall called',
      '@@ schedule task for:1, currently: 0 @@',
      'The option was exercised. Please collect the assets in your payout.',
      'covered call was shut down due to "Swap completed."',
      'bobMoolaPurse: balance {"brand":{},"value":3}',
      'bobSimoleanPurse: balance {"brand":{},"value":0}',
      'aliceMoolaPurse: balance {"brand":{},"value":0}',
      'aliceSimoleanPurse: balance {"brand":{},"value":7}',
    ]

## zoe - swapForOption - valid inputs

> Snapshot 1

    [
      '=> alice, bob, carol and dave are set up',
      '=> alice.doSwapForOption called',
      'call option made',
      '@@ schedule task for:100, currently: 0 @@',
      'swap invitation made',
      'The offer has been accepted. Once the contract has been completed, please check your payout',
      'The option was exercised. Please collect the assets in your payout.',
      'daveMoolaPurse: balance {"brand":{},"value":3}',
      'daveSimoleanPurse: balance {"brand":{},"value":0}',
      'daveBucksPurse: balance {"brand":{},"value":0}',
      'bobMoolaPurse: balance {"brand":{},"value":0}',
      'bobSimoleanPurse: balance {"brand":{},"value":0}',
      'bobBucksPurse;: balance {"brand":{},"value":1}',
      'aliceMoolaPurse: balance {"brand":{},"value":0}',
      'aliceSimoleanPurse: balance {"brand":{},"value":7}',
    ]

## zoe - secondPriceAuction - valid inputs

> Snapshot 1

    [
      '=> alice, bob, carol and dave are set up',
      'Carol: The offer has been accepted. Once the contract has been completed, please check your payout',
      'Bob: The offer has been accepted. Once the contract has been completed, please check your payout',
      '@@ schedule task for:1, currently: 0 @@',
      'Dave: The offer has been accepted. Once the contract has been completed, please check your payout',
      '@@ tick:1 @@',
      'carolMoolaPurse: balance {"brand":{},"value":0}',
      'bobMoolaPurse: balance {"brand":{},"value":1}',
      'daveMoolaPurse: balance {"brand":{},"value":0}',
      'carolSimoleanPurse: balance {"brand":{},"value":7}',
      'bobSimoleanPurse: balance {"brand":{},"value":4}',
      'daveSimoleanPurse: balance {"brand":{},"value":5}',
      'aliceMoolaPurse: balance {"brand":{},"value":0}',
      'aliceSimoleanPurse: balance {"brand":{},"value":7}',
    ]

## zoe - atomicSwap - valid inputs

> Snapshot 1

    [
      '=> alice and bob are set up',
      'The offer has been accepted. Once the contract has been completed, please check your payout',
      'aliceMoolaPurse: balance {"brand":{},"value":0}',
      'bobMoolaPurse: balance {"brand":{},"value":3}',
      'aliceSimoleanPurse: balance {"brand":{},"value":7}',
      'bobSimoleanPurse: balance {"brand":{},"value":0}',
    ]

## zoe - simpleExchange - valid inputs

> Snapshot 1

    [
      '=> alice and bob are set up',
      'Order Added',
      'Order Added',
      'bobMoolaPurse: balance {"brand":{},"value":3}',
      'bobSimoleanPurse: balance {"brand":{},"value":3}',
      'aliceMoolaPurse: balance {"brand":{},"value":0}',
      'aliceSimoleanPurse: balance {"brand":{},"value":4}',
    ]

## zoe - simpleExchange - state Update

> Snapshot 1

    [
      '=> alice and bob are set up',
      '{"buys":[],"sells":[]}',
      '{"buys":[],"sells":[{"give":{"Asset":{"brand":{},"value":3}},"want":{"Price":{"brand":{},"value":4}}}]}',
      'Order Added',
      '{"buys":[],"sells":[]}',
      'Order Added',
      'bobMoolaPurse: balance {"brand":{},"value":0}',
      'bobSimoleanPurse: balance {"brand":{},"value":20}',
      '{"buys":[{"give":{"Price":{"brand":{},"value":2}},"want":{"Asset":{"brand":{},"value":8}}}],"sells":[]}',
      'Order Added',
      'bobMoolaPurse: balance {"brand":{},"value":3}',
      'bobSimoleanPurse: balance {"brand":{},"value":18}',
      '{"buys":[{"give":{"Price":{"brand":{},"value":2}},"want":{"Asset":{"brand":{},"value":8}}},{"give":{"Price":{"brand":{},"value":13}},"want":{"Asset":{"brand":{},"value":20}}}],"sells":[]}',
      'Order Added',
      'bobMoolaPurse: balance {"brand":{},"value":3}',
      'bobSimoleanPurse: balance {"brand":{},"value":5}',
      '{"buys":[{"give":{"Price":{"brand":{},"value":2}},"want":{"Asset":{"brand":{},"value":8}}},{"give":{"Price":{"brand":{},"value":13}},"want":{"Asset":{"brand":{},"value":20}}},{"give":{"Price":{"brand":{},"value":2}},"want":{"Asset":{"brand":{},"value":5}}}],"sells":[]}',
      'Order Added',
      'bobMoolaPurse: balance {"brand":{},"value":3}',
      'bobSimoleanPurse: balance {"brand":{},"value":3}',
      'aliceMoolaPurse: balance {"brand":{},"value":0}',
      'aliceSimoleanPurse: balance {"brand":{},"value":4}',
    ]

## zoe - autoswap - valid inputs

> Snapshot 1

    [
      '=> alice and bob are set up',
      'Added liquidity.',
      'simoleanAmounts {"brand":{},"value":1}',
      'Swap successfully completed.',
      'moola proceeds {"brand":{},"value":5}',
      'Swap successfully completed.',
      'bobMoolaPurse: balance {"brand":{},"value":5}',
      'bobSimoleanPurse: balance {"brand":{},"value":5}',
      'simoleans required {"brand":{},"value":5}',
      'Liquidity successfully removed.',
      'poolAmounts{"Central":{"brand":{},"value":0},"Liquidity":{"brand":{},"value":10},"Secondary":{"brand":{},"value":0}}',
      'aliceMoolaPurse: balance {"brand":{},"value":8}',
      'aliceSimoleanPurse: balance {"brand":{},"value":7}',
      'aliceLiquidityTokenPurse: balance {"brand":{},"value":0}',
    ]

## zoe - sellTickets - valid inputs

> Snapshot 1

    [
      '=> alice and bob are set up',
      'availableTickets: {"brand":{},"value":[{"number":3,"show":"Steven Universe, the Opera","start":"Wed, March 25th 2020 at 8pm"},{"number":2,"show":"Steven Universe, the Opera","start":"Wed, March 25th 2020 at 8pm"},{"number":1,"show":"Steven Universe, the Opera","start":"Wed, March 25th 2020 at 8pm"}]}',
      'boughtTicketAmount: {"brand":{},"value":[{"number":1,"show":"Steven Universe, the Opera","start":"Wed, March 25th 2020 at 8pm"}]}',
      'after ticket1 purchased: {"brand":{},"value":[{"number":3,"show":"Steven Universe, the Opera","start":"Wed, March 25th 2020 at 8pm"},{"number":2,"show":"Steven Universe, the Opera","start":"Wed, March 25th 2020 at 8pm"}]}',
      'alice earned: {"brand":{},"value":22}',
    ]

## zoe - otcDesk - valid inputs

> Snapshot 1

    [
      '=> alice and bob are set up',
      'Inventory added',
      '@@ schedule task for:1, currently: 0 @@',
      'The option was exercised. Please collect the assets in your payout.',
      '{"brand":{},"value":3}',
      '{"brand":{},"value":0}',
      'Inventory removed',
      '{"brand":{},"value":2}',
    ]

## zoe - shutdown autoswap

> Snapshot 1

    [
      '=> alice and bob are set up',
      'vat terminated',
      'aliceMoolaPurse: balance {"brand":{},"value":0}',
      'aliceSimoleanPurse: balance {"brand":{},"value":0}',
    ]