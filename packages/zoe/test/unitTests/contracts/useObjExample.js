// @ts-check

// Eventually will be importable from '@agoric/zoe-contract-support'
import { assert, details } from '@agoric/assert';
import {
  assertIssuerKeywords,
  assertProposalKeywords,
} from '../../../src/contractSupport';

/**
 * Give a use object when a payment is escrowed
 * @type {ContractStartFn}
 */
const start = (zcf, _terms) => {
  assertIssuerKeywords(zcf, harden(['Pixels']));
  const { brandKeywordRecord } = zcf.getInstanceRecord();
  const amountMath = zcf.getAmountMath(brandKeywordRecord.Pixels);

  const makeUseObj = seat => {
    const useObj = harden({
      /**
       * (Pretend to) color some pixels.
       * @param {string} color
       * @param {Amount} amountToColor
       */
      colorPixels: (color, amountToColor = undefined) => {
        // Throw if the offer is no longer active, i.e. the user has
        // completed their offer and the assets are no longer escrowed.
        assert(!seat.hasExited(), `the escrowing offer is no longer active`);
        const escrowedAmount = seat.getAmountAllocated(
          'Pixels',
          brandKeywordRecord.Pixels,
        );
        // If no amountToColor is provided, color all the pixels
        // escrowed for this offer.
        if (amountToColor === undefined) {
          amountToColor = escrowedAmount;
        }
        // Ensure that the amount of pixels that we want to color is
        // covered by what is actually escrowed.
        assert(
          amountMath.isGTE(escrowedAmount, amountToColor),
          details`The pixels to color were not all escrowed. Currently escrowed: ${escrowedAmount}, amount to color: ${amountToColor}`,
        );

        // Pretend to color
        return `successfully colored ${amountToColor.value} pixels ${color}`;
      },
    });
    return useObj;
  };

  const expected = harden({
    give: { Pixels: null },
  });

  const publicFacet = {
    // The only publicFacet method is to make an invite.
    makeInvitation: () =>
      zcf.makeInvitation(
        assertProposalKeywords(makeUseObj, expected),
        'use object',
      ),
  };

  return harden({ publicFacet });
};

harden(start);
export { start };
