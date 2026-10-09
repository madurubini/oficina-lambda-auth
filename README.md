# oficina-lambda-auth

Funções serverless da Oficina (AWS SAM, TypeScript): o API Gateway de entrada, a Lambda `auth-cpf` (CPF → JWT do cliente) e a Lambda Authorizer que confere o JWT antes de encaminhar para a API.

## Onde este repositório se encaixa

A Fase 3 é dividida em 4 repositórios, que se conversam por nomes na AWS, pelo state do Terraform
no S3 e por secrets do GitHub (nenhum importa código de outro):

| # | Repositório | O que cria |
|---|---|---|
| ① | [`oficina-infra-k8s`](https://github.com/madurubini/oficina-infra-k8s) | VPC, subnets, cluster EKS, nós e ECR |
| ② | [`oficina-infra-db`](https://github.com/madurubini/oficina-infra-db) | RDS Postgres dentro da VPC do ① |
| ③ | [`oficina-app`](https://github.com/madurubini/oficina-app) | API NestJS no EKS + Load Balancer |
| ④ | [`oficina-lambda-auth`](https://github.com/madurubini/oficina-lambda-auth) | API Gateway, Lambda `auth-cpf` e Lambda Authorizer |

**Ordem para subir:** ① → ② → ③ → ④. **Ordem para derrubar:** ④ → ③ → ② → ①.

Branches: **`main` = produção** (só recebe PR), **`homolog` = homologação**.
