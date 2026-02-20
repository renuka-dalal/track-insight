# infrastructure/aws/eks/main.tf
# EKS cluster configuration

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
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
  private_subnet_ids  = data.terraform_remote_state.shared.outputs.private_subnet_ids
  backend_ecr_url     = data.terraform_remote_state.shared.outputs.backend_ecr_url
  frontend_ecr_url    = data.terraform_remote_state.shared.outputs.frontend_ecr_url
  database_url        = data.terraform_remote_state.shared.outputs.database_url
  cluster_name        = "${var.project_name}-${var.environment}-eks"
}
