# infrastructure/aws/ecs/outputs.tf
# Outputs from ECS infrastructure

output "application_url" {
  description = "Application URL"
  value       = "http://${aws_lb.main.dns_name}"
}

output "backend_url" {
  description = "Backend API URL"
  value       = "http://${aws_lb.main.dns_name}/api"
}

output "summary" {
  description = "Deployment summary"
  value = {
    application_url       = "http://${aws_lb.main.dns_name}"
    ecs_cluster          = aws_ecs_cluster.main.name
    backend_service      = aws_ecs_service.backend.name
    frontend_service     = aws_ecs_service.frontend.name
    alb_dns              = aws_lb.main.dns_name
    cloudwatch_logs      = {
      backend  = aws_cloudwatch_log_group.backend.name
      frontend = aws_cloudwatch_log_group.frontend.name
    }
  }
}
