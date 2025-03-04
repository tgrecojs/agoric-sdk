#!/bin/bash

# Create a temporary directory to store offer files
TEMP_DIR='tmp'
# trap 'rm -rf "$TEMP_DIR"' EXIT

temp_file="${TEMP_DIR}/pause_offer.json"

# Execute the claim command and save output to temporary file, extracting only the JSON
echo "Preparing claim for pubkey: $pubkey with tier: $tier"
yarn agops airdropper pause  --nextState paused --offerFilter 'claim airdrop' | grep '^{' > "$temp_file"

# Start timing the wallet send operation
start_time=$(date +%s.%N)

# Send the offer using agoric wallet
echo "Sending offer for address: $address"
agoric wallet --keyring-backend="test" send --from agoric1jng25adrtpl53eh50q7fch34e0vn4g72j6zcml --offer "$temp_file"