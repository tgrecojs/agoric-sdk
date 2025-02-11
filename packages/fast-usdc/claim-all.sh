#!/bin/bash

# Create a temporary directory to store offer files
TEMP_DIR='tmp'
# trap 'rm -rf "$TEMP_DIR"' EXIT

# Initialize counter and metrics file
iteration=0
max_iterations=500
metrics_file="metrics_$(date +%Y%m%d_%H%M%S).log"
script_start_time=$(date +%s)
echo "Script started at: $(date -r $script_start_time)" > "$metrics_file"

# Read the JSON file and iterate over each object
jq -c '.[]' with-proofs.json | while read -r item; do
    # Check if we've reached the maximum iterations
    if [ $iteration -ge $max_iterations ]; then
        script_end_time=$(date +%s)
        echo "Script ended at: $(date -r $script_end_time)" >> "$metrics_file"
        echo "Total execution time: $((script_end_time - script_start_time)) seconds" >> "$metrics_file"
        echo "Reached maximum iterations ($max_iterations). Stopping..."
        break
    fi
    
    # Extract the required fields
    proof=$(echo $item | jq -r '.proof | tostring')
    pubkey=$(echo $item | jq -r '.pubkey.key')
    tier=$(echo $item | jq -r '.tier')
    address=$(echo $item | jq -r '.address')
    
    # Create a unique temporary file for this iteration
    temp_file="${TEMP_DIR}/offer_${address}.json"
    
    # Execute the claim command and save output to temporary file, extracting only the JSON
    echo "Preparing claim for pubkey: $pubkey with tier: $tier"
    yarn agops airdropper claim --proof "$proof" --pubkey "$pubkey" --tier "$tier" | grep '^{' > "$temp_file"
    
    # Start timing the wallet send operation
    start_time=$(date +%s.%N)
    
    # Send the offer using agoric wallet
    echo "Sending offer for address: $address"
    agoric wallet --keyring-backend="test" send --from "$address" --offer "$temp_file"
    
    # Calculate execution time
    end_time=$(date +%s.%N)
    execution_time=$(echo "$end_time - $start_time" | bc)
    
    # Log metrics
    {
        echo "Iteration: $iteration"
        echo "Address: $address"
        echo "Start time: $(date -r ${start_time%.*})"
        echo "End time: $(date -r ${end_time%.*})"
        echo "Execution time: $execution_time seconds"
        echo "---"
    } >> "$metrics_file"
    
    # Increment counter
    iteration=$((iteration + 1))
    echo "Completed iteration $iteration of $max_iterations"
    
    sleep 1
done