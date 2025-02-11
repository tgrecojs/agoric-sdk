# Create a temporary directory to store offer files
TEMP_DIR='tmp'
# trap 'rm -rf "$TEMP_DIR"' EXIT

# Initialize counter
count=0
batch_size=5
batch_delay=6

# Read the JSON file and iterate over each object
jq -c '.[]' account-subset.json | while read -r item; do
    # Extract the required fields
    proof=$(echo $item | jq -r '.proof | tostring')
    pubkey=$(echo $item | jq -r '.pubkey.key')
    tier=$(echo $item | jq -r '.tier')
    address=$(echo $item | jq -r '.address')
    
    # Create a unique temporary file for this iteration
    temp_file="${TEMP_DIR}/offer_${address}.json"
    
    # Execute the claim command and save output to temporary file, extracting only the JSON
    echo "Preparing claim for pubkey: $pubkey with tier: $tier"
    yarn fast-usdc claim --proof "$proof" --pubkey "$pubkey" --tier "$tier" | grep '^{' > "$temp_file"
    
    # Send the offer using agoric wallet
    echo "Sending offer for address: $address"
    agoric wallet --keyring-backend="test" send --from "$address" --offer "$temp_file"    
    # Increment counter
    count=$((count + 1))
    
    # If we've processed batch_size items, wait and reset counter
    if [ $((count % batch_size)) -eq 0 ]; then
        echo "Processed $batch_size items, waiting $batch_delay seconds..."
        sleep $batch_delay
    fi
done
