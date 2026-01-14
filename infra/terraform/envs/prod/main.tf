terraform {
  required_version = ">= 1.5.0"
}

# Exemplo (AWS). Ajuste para seu ambiente.
module "higor" {
  source = "../../modules/ec2_docker_compose"

  name   = var.name
  region = var.region

  ami_id         = var.ami_id
  instance_type  = var.instance_type
  key_name       = var.key_name
  vpc_id         = var.vpc_id
  subnet_id      = var.subnet_id
  allowed_ssh_cidr = var.allowed_ssh_cidr

  # Veja README infra: gerar base64 de compose/env
  compose_b64 = var.compose_b64
  env_b64     = var.env_b64
}

output "public_ip" {
  value = module.higor.public_ip
}
