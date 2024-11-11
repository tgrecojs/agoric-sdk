# see https://github.com/cosmology-tech/starship/blob/0e18757b8393357fc66426c5ee23da4ccf760e74/examples/getting-started/Makefile

NAME = agoric-multichain-testing
FILE = config.yaml

HELM_REPO = starship
HELM_CHART = devnet
HELM_VERSION = v0.2.20

###############################################################################
###                              All commands                               ###
###############################################################################

.PHONY: setup
setup: setup-deps setup-kind

.PHONY: stop
stop: stop-forward delete

.PHONY: clean
clean: stop clean-kind

###############################################################################
###                          Dependency check                               ###
###############################################################################

.PHONY: check
setup-deps:
	bash $(CURDIR)/scripts/dev-setup.sh

###############################################################################
###                              Helm Charts                                ###
###############################################################################

install:
	bash $(CURDIR)/scripts/install.sh --config $(FILE) --name $(NAME) --version $(HELM_VERSION)

delete:
	-helm delete $(NAME)

###############################################################################
###                                 Port forward                            ###
###############################################################################

.PHONY: port-forward
port-forward:
	bash $(CURDIR)/scripts/port-forward.sh --config=$(FILE)

.PHONY: stop-forward
stop-forward:
	-pkill -f "port-forward"

###############################################################################
###                          Local Kind Setup                               ###
###############################################################################
KIND_CLUSTER=agship

.PHONY: setup-kind
setup-kind:
	kind create cluster --name $(KIND_CLUSTER)

.PHONY: clean-kind
clean-kind:
	-kind delete cluster --name $(KIND_CLUSTER)

###############################################################################
###                          Agoric Setup                                   ###
###############################################################################
PROVISION_POOL_ADDR=agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346

# add address
add-address:
	kubectl exec -i agoriclocal-genesis-0 -c validator -- agd keys add user1


ADDRESS_FILE=./addresses.json
# add multiple addresses from JSON file
# add multiple addresses from JSON file with timestamp and save output
KEYS_OUTPUT_FILE=generated_keys.json

# add multiple addresses from JSON file with timestamp and save output
add-addresses:
	@counter=1; \
	timestamp=$$(date +%s); \
	echo '{"keys": [' > $(KEYS_OUTPUT_FILE); \
	first=true; \
	for addr in $$(jq -r '.addresses[]' $(ADDRESS_FILE)); do \
		echo "Adding address: wallet-$$timestamp-$$counter"; \
		if [ "$$first" = "true" ]; then \
			first=false; \
		else \
			echo ',' >> $(KEYS_OUTPUT_FILE); \
		fi; \
		kubectl exec -i agoriclocal-genesis-0 -c validator -- agd keys add wallet-$$timestamp-$$counter \
			| tee /dev/tty \
			| jq '.' >> $(KEYS_OUTPUT_FILE); \
		counter=$$((counter + 1)); \
		sleep 1; \
	done; \
	echo ']}' >> $(KEYS_OUTPUT_FILE); \
	echo "Key generation output saved to $(KEYS_OUTPUT_FILE)"

# Format the output file to make it more readable
format-output:
	@jq '.' $(KEYS_OUTPUT_FILE) > $(KEYS_OUTPUT_FILE).tmp && mv $(KEYS_OUTPUT_FILE).tmp $(KEYS_OUTPUT_FILE)
# Alternative with formatted timestamp
add-addresses-formatted:
	@counter=1; \
	timestamp=$$(date +%Y%m%d_%H%M%S); \
	for addr in $$(jq -r '.addresses[]' $(ADDRESS_FILE)); do \
		echo "Adding address: wallet-$$timestamp-$$counter"; \
		kubectl exec -i agoriclocal-genesis-0 -c validator -- agd keys add wallet-$$timestamp-$$counter | echo >(jq '.' >> $(KEYS_OUTPUT_FILE)); \
		counter=$$((counter + 1)); \
		sleep 1; \
	done

fund-provision-pool:
	kubectl exec -i agoriclocal-genesis-0 -c validator -- agd tx bank send faucet $(PROVISION_POOL_ADDR) 1000000000uist -y -b block

override-chain-registry:
	node_modules/.bin/tsx scripts/fetch-starship-chain-info.ts && \
	node_modules/.bin/tsx scripts/deploy-cli.ts src/revise-chain-info.builder.js
 
ADDR=agoric1jng25adrtpl53eh50q7fch34e0vn4g72j6zcml
COIN=1000000000uist

fund-wallet:
	kubectl exec -i agoriclocal-genesis-0 -c validator -- agd tx bank send faucet $(ADDR) $(COIN) -y -b block

provision-smart-wallet:
	kubectl exec -i agoriclocal-genesis-0 -c validator -- agd tx swingset provision-one wallet $(kagd keys show tg -a) SMART_WALLET --from $(kagd keys show tg -a) -y -b block

# view agoric swingset logs from slog file, until we can set `DEBUG=SwingSet:vat,SwingSet:ls`
tail-slog:
	kubectl exec -i agoriclocal-genesis-0 -c validator -- tail -f slog.slog

###############################################################################
###                           Start All                                     ###
###############################################################################

.PHONY: wait-for-pods
wait-for-pods:
	node_modules/.bin/tsx scripts/pod-readiness.ts

.PHONY: start
start: install wait-for-pods port-forward fund-provision-pool override-chain-registry

