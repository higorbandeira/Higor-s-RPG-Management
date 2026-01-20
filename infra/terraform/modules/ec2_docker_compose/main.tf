terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "name" { type = string }
variable "region" { type = string }
variable "ami_id" { type = string }
variable "instance_type" { type = string, default = "t3.micro" }
variable "key_name" { type = string }
variable "vpc_id" { type = string }
variable "subnet_id" { type = string }
variable "allowed_ssh_cidr" { type = string, default = "0.0.0.0/0" }

# These are *placeholders* for a real deployment pipeline.
# Recommended flow:
# 1) Build & push Docker images to a registry (ECR/Docker Hub)
# 2) Provide docker-compose.prod.yml + .env via user_data or SSM
variable "compose_b64" {
  type        = string
  description = "Base64 of docker-compose.prod.yml"
}
variable "env_b64" {
  type        = string
  description = "Base64 of .env.prod"
}

provider "aws" {
  region = var.region
}

resource "aws_security_group" "this" {
  name   = "${var.name}-sg"
  vpc_id = var.vpc_id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "this" {
  ami                         = var.ami_id
  instance_type               = var.instance_type
  key_name                    = var.key_name
  subnet_id                   = var.subnet_id
  vpc_security_group_ids      = [aws_security_group.this.id]
  associate_public_ip_address = true

  user_data = <<-EOT
    #!/bin/bash
    set -e

    # Install Docker
    yum update -y
    amazon-linux-extras install docker -y || true
    yum install -y docker
    service docker start
    usermod -a -G docker ec2-user

    # Install docker-compose plugin
    mkdir -p /usr/local/lib/docker/cli-plugins
    curl -L "https://github.com/docker/compose/releases/download/v2.29.2/docker-compose-linux-x86_64" -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

    mkdir -p /opt/higor
    cd /opt/higor

    echo "${var.compose_b64}" | base64 -d > docker-compose.prod.yml
    echo "${var.env_b64}" | base64 -d > .env

    docker compose -f docker-compose.prod.yml --env-file .env up -d
  EOT

  tags = {
    Name = var.name
  }
}

output "public_ip" {
  value = aws_instance.this.public_ip
}
