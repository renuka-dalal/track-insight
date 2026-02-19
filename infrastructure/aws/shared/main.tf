# infrastructure/aws/shared/main.tf
# Shared AWS infrastructure for Track Insight
# Used by both ECS and EKS deployments

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

# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# Use the first 2 AZs
locals {
  azs = slice(data.aws_availability_zones.available.names, 0, 2)
}
