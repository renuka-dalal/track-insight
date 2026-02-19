# infrastructure/aws/ecs/main.tf
# ECS-specific infrastructure for Track Insight

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = var.tags
  }
}

# Data source to get shared infrastructure outputs
data "terraform_remote_state" "shared" {
  backend = "local"

  config = {
    path = "../shared/terraform.tfstate"
  }
}

# Local variables from shared infrastructure
locals {
  vpc_id              = data.terraform_remote_state.shared.outputs.vpc_id
  public_subnet_ids   = data.terraform_remote_state.shared.outputs.public_subnet_ids
  private_subnet_ids  = data.terraform_remote_state.shared.outputs.private_subnet_ids
  app_security_group_id = data.terraform_remote_state.shared.outputs.app_security_group_id
  backend_ecr_url     = data.terraform_remote_state.shared.outputs.backend_ecr_url
  frontend_ecr_url    = data.terraform_remote_state.shared.outputs.frontend_ecr_url
  database_url        = data.terraform_remote_state.shared.outputs.database_url
}
