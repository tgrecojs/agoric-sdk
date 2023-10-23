import '@agoric/zoe/exported.js';
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import bundleSource from '@endo/bundle-source';
import { E } from '@endo/eventual-send';
import { resolve as importMetaResolve } from 'import-meta-resolve';

import { AmountMath, makeIssuerKit } from '@agoric/ertp';

import { assert } from '@agoric/assert';
import { makeTracer } from '@agoric/internal';
import { Far } from '@endo/marshal';

const vaultRoot = './vault-contract-wrapper.js';
const trace = makeTracer('TestVault', false);

/**
 * The properties will be asssigned by `setTestJig` in the contract.
 *
 * @typedef {object} TestContext
 * @property {ZCF} zcf
 * @property {ZCFMint} stableMint
 * @property {IssuerKit} collateralKit
 * @property {Vault} vault
 * @property {Function} advanceRecordingPeriod
 * @property {Function} setInterestRate
 */
let testJig;
/** @param {TestContext} jig */
const setJig = jig => {
    testJig = jig;
};

const { zoe, feeMintAccessP: feeMintAccess } = await setUpZoeForTest({
    setJig,
    useNearRemote: true,
});
trace('makeZoe');

const defaultGreetingMsgFn = input => `Hey there, ${input}! Word on the street is that you are interested in some leverage but you are not too fond of liquidaations.
        Well, I have some good news for you - neither am I!`;

const createGreeting = (userName = 'shithead') => defaultGreetingMsgFn(userName);

const hasArgument = x => !x ? 'shithead' : x;

const leverageGreeting = Far('greeting facet', { fn(x) { console.log('input passed to fn:::', { x }); return createGreeting(hasArgument(x.name)) } })

/**
 * @param {ERef<ZoeService>} zoeP
 * @param {string} sourceRoot
 */
async function launch(zoeP, sourceRoot) {
    console.log('inside launch::::::::::::', { zoe, sourceRoot });
    const contractUrl = await importMetaResolve(sourceRoot, import.meta.url);
    const contractPath = new URL(contractUrl).pathname;
    console.log('----------------------', { contractPath });
    const contractBundle = await bundleSource(contractPath);
    console.log('----------------------', { contractBundle });

    const installation = await E(zoeP).install(contractBundle);
    console.log('----------------------', { contractInstallation: installation });

    const { creatorInvitation, creatorFacet, instance, ...rest } = await E(
        zoeP,
    ).startInstance(
        installation,
        undefined,
        undefined,
        harden({
            feeMintAccess, leverageGreeting
        }),
    );
    console.log('############ creatorInvitation -------', { creatorInvitation });
    console.log('############ creatorFacet -------', { creatorFacet });

    console.log('############ instance -------', { instance });
    console.log('############ REST -------', { rest });

    const {
        stableMint,
        collateralKit: { mint: collateralMint, brand: collateralBrand, issuer: collateralIssuer },
    } = testJig;
    const { brand: stableBrand } = stableMint.getIssuerRecord();

    const getBrandDetails = issuer => ({ brand: issuer.getBrand(), allegedName: issuer.getAllegedName(), assetKind: issuer.getAssetKind() })

    console.log('###### collateralMint', { ...getBrandDetails(collateralIssuer) })
    const collateral50 = AmountMath.make(collateralBrand, 50n);
    const proposal = harden({
        give: { Collateral: collateral50 },
        want: { Minted: AmountMath.make(stableBrand, 70n) },
    });
    const payments = harden({
        Collateral: collateralMint.mintPayment(collateral50),
    });
    assert(creatorInvitation);
    return {
        creatorSeat: E(zoeP).offer(creatorInvitation, proposal, payments),
        creatorFacet,
        instance,
    };
}

const helperContract = launch(zoe, vaultRoot);

test('first', async t => {
    const { creatorSeat, creatorFacet } = await helperContract;

    // Our wrapper gives us a Vault which holds 50 Collateral, has lent out 70
    // Minted (charging 3 Minted fee), which uses an automatic market maker that
    // presents a fixed price of 4 Minted per Collateral.
    await E(creatorSeat).getOfferResult();
    const { stableMint, collateralKit, vault } = testJig;
    const { brand: stableBrand } = stableMint.getIssuerRecord();

    const { issuer: cIssuer, mint: cMint, brand: cBrand } = collateralKit;

    t.deepEqual(
        vault.getCurrentDebt(),
        AmountMath.make(stableBrand, 74n),
        'borrower owes 74 Minted',
    );
    t.deepEqual(
        vault.getCollateralAmount(),
        AmountMath.make(cBrand, 50n),
        'vault holds 50 Collateral',
    );

    // Add more collateral to an existing loan. We get nothing back but a warm
    // fuzzy feeling.

    const collateralAmount = AmountMath.make(cBrand, 20n);
    const invite = await E(creatorFacet).makeAdjustBalancesInvitation();
    const giveCollateralSeat = await E(zoe).offer(
        invite,
        harden({
            give: { Collateral: collateralAmount },
            want: {}, // Minted: AmountMath.make(stableBrand, 2n) },
        }),
        harden({
            // TODO
            Collateral: cMint.mintPayment(collateralAmount),
        }),
    );

    await E(giveCollateralSeat).getOfferResult();
    t.deepEqual(
        vault.getCollateralAmount(),
        AmountMath.make(cBrand, 70n),
        'vault holds 70 Collateral',
    );
    trace('addCollateral');

    // partially payback
    const collateralWanted = AmountMath.make(cBrand, 1n);
    const paybackAmount = AmountMath.make(stableBrand, 3n);
    const payback = await E(creatorFacet).mintRun(paybackAmount);
    const paybackSeat = E(zoe).offer(
        vault.makeAdjustBalancesInvitation(),
        harden({
            give: { Minted: paybackAmount },
            want: { Collateral: collateralWanted },
        }),
        harden({ Minted: payback }),
    );
    await E(paybackSeat).getOfferResult();

    const returnedCollateral = await E(paybackSeat).getPayout('Collateral');
    trace('returnedCollateral', returnedCollateral, cIssuer);
    const returnedAmount = await cIssuer.getAmountOf(returnedCollateral);
    t.deepEqual(
        vault.getCurrentDebt(),
        AmountMath.make(stableBrand, 71n),
        'debt reduced to 71 Minted',
    );
    t.deepEqual(
        vault.getCollateralAmount(),
        AmountMath.make(cBrand, 69n),
        'vault holds 69 Collateral',
    );
    t.deepEqual(
        returnedAmount,
        AmountMath.make(cBrand, 1n),
        'withdrew 1 collateral',
    );
    t.is(returnedAmount.value, 1n, 'withdrew 1 collateral');
});

// test('bad collateral', async t => {
//     const { creatorSeat: offerKit } = await helperContract;

//     console.log('offerKit::::', { offerKit, helperContract });
//     const { stableMint, collateralKit, vault } = testJig;

//     // Our wrapper gives us a Vault which holds 50 Collateral, has lent out 70
//     // Minted (charging 3 Minted fee), which uses an automatic market maker that
//     // presents a fixed price of 4 Minted per Collateral.
//     await E(offerKit).getOfferResult();
//     const { brand: collateralBrand } = collateralKit;
//     const { brand: stableBrand } = stableMint.getIssuerRecord();

//     const cf = (await helperContract).creatorFacet;

//     const invitationIssuer = await E(zoe).getInvitationIssuer();
//     const makeIstInviation = await E(cf).makeAdjustBalancesInvitation();

//     t.deepEqual(await E(invitationIssuer).isLive(makeIstInviation), true);
//     console.log(
//         'helperContract::creatorSeat',
//         (await helperContract).creatorSeat,
//     );
//     console.log('helperContract::makeIstInviation', makeIstInviation);
//     console.log('insopdect paymnet:::');
//     t.deepEqual(
//         vault.getCollateralAmount(),
//         AmountMath.make(collateralBrand, 50n),
//         'vault should hold 50 Collateral',
//     );
//     t.deepEqual(
//         vault.getCurrentDebt(),
//         AmountMath.make(stableBrand, 74n),
//         'borrower owes 74 Minted',
//     );

//     const collateralAmount = AmountMath.make(collateralBrand, 2n);

//     // adding the wrong kind of collateral should be rejected
//     const { mint: wrongMint, brand: wrongBrand } = makeIssuerKit('wrong');
//     const wrongAmount = AmountMath.make(wrongBrand, 2n);
//     const p = E(zoe).offer(
//         vault.makeAdjustBalancesInvitation(),
//         harden({
//             give: { Collateral: collateralAmount },
//             want: {},
//         }),
//         harden({
//             Collateral: wrongMint.mintPayment(wrongAmount),
//         }),
//     );
//     try {
//         await p;
//         t.fail('not rejected when it should have been');
//     } catch (e) {
//         t.truthy(true, 'yay rejection');
//     }
//     // p.then(_ => console.log('oops passed'),
//     //       rej => console.log('reg', rej));
//     // t.rejects(p, / /, 'addCollateral requires the right kind', {});
//     // t.throws(async () => { await p; }, /was not a live payment/);
// });
