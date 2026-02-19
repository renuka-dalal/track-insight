# infrastructure/aws/ecs/ecs-frontend-service.tf
# Frontend ECS Task Definition and Service

# Get ALB DNS for frontend to call backend
locals {
  backend_url = "http://${aws_lb.main.dns_name}"
}

# Task Definition for Frontend
resource "aws_ecs_task_definition" "frontend" {
  family                   = "${var.project_name}-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.frontend_cpu
  memory                   = var.frontend_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([{
    name      = "frontend"
    image     = "${local.frontend_ecr_url}:latest"
    essential = true

    portMappings = [{
      containerPort = 10000  # Changed from 3000 to match nginx config
      protocol      = "tcp"
    }]

    environment = [
      {
        name  = "VITE_API_URL"
        value = local.backend_url
      }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.frontend.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }

  }])

  tags = {
    Name = "${var.project_name}-frontend-task"
  }
}

# ECS Service for Frontend
resource "aws_ecs_service" "frontend" {
  name            = "${var.project_name}-frontend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = local.private_subnet_ids
    security_groups  = [local.app_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 10000  # Changed from 3000
  }

  depends_on = [
    aws_lb_listener.http
  ]

  tags = {
    Name = "${var.project_name}-frontend-service"
  }
}

# Outputs
output "frontend_task_definition_arn" {
  description = "Frontend task definition ARN"
  value       = aws_ecs_task_definition.frontend.arn
}
