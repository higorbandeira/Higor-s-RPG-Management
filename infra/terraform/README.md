# Terraform (Deploy - Exemplo AWS EC2 + Docker Compose)

Este diretório traz um **exemplo** de deploy com Terraform usando uma instância EC2 rodando `docker compose`.

> É um template genérico: adapte VPC/Subnet/AMI/KeyPair conforme seu ambiente.

## Pré-requisitos
- Terraform >= 1.5
- Conta AWS + credenciais configuradas
- Imagens Docker publicadas (ECR ou Docker Hub)

## Passos
1) Build & push das imagens
- `apps/api` -> `API_IMAGE`
- `apps/web` -> `WEB_IMAGE`

2) Monte seu `.env.prod` (use `infra/deploy/.env.prod.example` como base)

3) Gere os base64 (necessários para o user_data do EC2)
```bash
base64 -w 0 infra/deploy/docker-compose.prod.yml > compose.b64
base64 -w 0 infra/deploy/.env.prod > env.b64
```

4) Aplique o Terraform
```bash
cd infra/terraform/envs/prod
terraform init
terraform apply \
  -var "name=higor" \
  -var "region=us-east-1" \
  -var "ami_id=<AMI_AMAZON_LINUX_2>" \
  -var "key_name=<KEY_PAIR>" \
  -var "vpc_id=<VPC_ID>" \
  -var "subnet_id=<SUBNET_ID>" \
  -var "compose_b64=$(cat ../../../compose.b64)" \
  -var "env_b64=$(cat ../../../env.b64)"
```

## Observações
- Em produção, defina `COOKIE_SECURE=true` (já configurado no compose prod)
- O bootstrap do ADMIN exige `BOOTSTRAP_ADMIN_NICKNAME` e `BOOTSTRAP_ADMIN_PASSWORD` no `.env.prod`.
- Recomendado colocar SSH restrito (defina `allowed_ssh_cidr`).
