# infrastructure/aws/shared/outputs.tf
# Outputs from shared infrastructure

# VPC Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

# Security Group Outputs
output "rds_security_group_id" {
  description = "RDS security group ID"
  value       = aws_security_group.rds.id
}

output "app_security_group_id" {
  description = "Application security group ID"
  value       = aws_security_group.app.id
}

# Summary output
output "infrastructure_summary" {
  description = "Summary of deployed infrastructure"
  value = {
    vpc_id              = aws_vpc.main.id
    availability_zones  = local.azs
    public_subnets      = aws_subnet.public[*].id
    private_subnets     = aws_subnet.private[*].id
    rds_endpoint        = aws_db_instance.postgres.endpoint
    backend_ecr         = aws_ecr_repository.backend.repository_url
    frontend_ecr        = aws_ecr_repository.frontend.repository_url
  }
}
