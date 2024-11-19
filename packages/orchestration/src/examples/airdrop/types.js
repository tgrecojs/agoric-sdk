/**
 * @typedef {string} PublicKeyHash - A SHA-256 hash of a public key, represented as a hexadecimal string.
 */

/**
 * An array of SHA-256 hashes, each computed against a different cryptocurrency public key.
 * @typedef {PublicKeyHash[]} PubkeyHashArray
 */

/**
 * Computes the SHA-256 hash of a Uint8Array and encodes it as a hexadecimal string.
 *
 * @param {Uint8Array} data - The input Uint8Array to hash.
 * @returns {string} The hexadecimal representation of the SHA-256 hash of the input data.
 */
