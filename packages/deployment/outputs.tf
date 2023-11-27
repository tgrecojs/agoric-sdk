output "public_ips" {
  value = {
    docker1 = "${module.docker1.public_ips}"
    docker2 = "${module.docker2.public_ips}"
    docker3 = "${module.docker3.public_ips}"
  }
}

output "roles" {
  value = "${var.ROLES}"
}

output "offsets" {
  value = "${var.OFFSETS}"
}
