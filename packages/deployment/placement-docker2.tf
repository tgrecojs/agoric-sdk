module "docker2" {
    source           = "/Users/tgreco/agoric-sdk/packages/deployment/terraform/docker"
    CLUSTER_NAME     = "ag-${var.NETWORK_NAME}-docker2"
    OFFSET           = "${var.OFFSETS["docker2"]}"
    SSH_KEY_FILE     = "docker2-${var.SSH_KEY_FILE}"
    ROLE             = "${var.ROLES["docker2"]}"
    SERVERS          = "${length(var.DATACENTERS["docker2"])}"
    VOLUMES          = "${var.VOLUMES["docker2"]}"
}
