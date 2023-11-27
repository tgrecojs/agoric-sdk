module "docker1" {
    source           = "/Users/tgreco/agoric-sdk/packages/deployment/terraform/docker"
    CLUSTER_NAME     = "ag-${var.NETWORK_NAME}-docker1"
    OFFSET           = "${var.OFFSETS["docker1"]}"
    SSH_KEY_FILE     = "docker1-${var.SSH_KEY_FILE}"
    ROLE             = "${var.ROLES["docker1"]}"
    SERVERS          = "${length(var.DATACENTERS["docker1"])}"
    VOLUMES          = "${var.VOLUMES["docker1"]}"
}
