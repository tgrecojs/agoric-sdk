module "docker3" {
    source           = "/Users/tgreco/agoric-sdk/packages/deployment/terraform/docker"
    CLUSTER_NAME     = "ag-${var.NETWORK_NAME}-docker3"
    OFFSET           = "${var.OFFSETS["docker3"]}"
    SSH_KEY_FILE     = "docker3-${var.SSH_KEY_FILE}"
    ROLE             = "${var.ROLES["docker3"]}"
    SERVERS          = "${length(var.DATACENTERS["docker3"])}"
    VOLUMES          = "${var.VOLUMES["docker3"]}"
}
