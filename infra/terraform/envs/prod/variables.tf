variable "name" { type = string }
variable "region" { type = string }
variable "ami_id" { type = string }
variable "instance_type" { type = string default = "t3.micro" }
variable "key_name" { type = string }
variable "vpc_id" { type = string }
variable "subnet_id" { type = string }
variable "allowed_ssh_cidr" { type = string default = "0.0.0.0/0" }
variable "compose_b64" { type = string }
variable "env_b64" { type = string }
