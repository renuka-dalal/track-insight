# Terraform Variables for Track Insight AWS Deployment

# Project Configuration
variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "track-insight"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

# Database Configuration
variable "db_username" {
  description = "PostgreSQL database username"
  type        = string
  default     = "postgres"
  sensitive   = true
}

variable "db_password" {
  description = "PostgreSQL database password"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "issue_tracker"
}

# OpenAI Configuration
variable "openai_api_key" {
  description = "OpenAI API key for AI assistant"
  type        = string
  sensitive   = true
}

# Application Configuration
variable "backend_image" {
  description = "Backend Docker image URI in ECR"
  type        = string
  default     = ""
}

variable "frontend_image" {
  description = "Frontend Docker image URI in ECR"
  type        = string
  default     = ""
}

variable "backend_cpu" {
  description = "CPU units for backend task (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "backend_memory" {
  description = "Memory for backend task in MB"
  type        = number
  default     = 512
}

variable "frontend_cpu" {
  description = "CPU units for frontend task"
  type        = number
  default     = 256
}

variable "frontend_memory" {
  description = "Memory for frontend task in MB"
  type        = number
  default     = 512
}

# Networking
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones for multi-AZ deployment"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

# Tags
variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Project     = "track-insight"
    ManagedBy   = "terraform"
    Environment = "dev"
  }
}
