# infrastructure/aws/ecs/variables.tf
# Variables for ECS deployment

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "track-insight"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  sensitive   = true
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

variable "github_repository" {
  description = "GitHub repository in format owner/repo"
  type        = string
  default     = "renuka-dalal/track-insight"
}

variable "github_branch" {
  description = "GitHub branch to monitor for changes"
  type        = string
  default     = "main"
}

variable "tags" {
  description = "Common tags"
  type        = map(string)
  default = {
    Project     = "track-insight"
    ManagedBy   = "terraform"
    Environment = "dev"
  }
}
