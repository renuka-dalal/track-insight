# infrastructure/aws/ecs/codepipeline.tf
# CodePipeline for automated deployments

# GitHub Connection (CodeStar Connections)
resource "aws_codestarconnections_connection" "github" {
  name          = "${var.project_name}-github-connection"
  provider_type = "GitHub"

  tags = {
    Name = "${var.project_name}-github"
  }
}

# CodePipeline
resource "aws_codepipeline" "main" {
  name     = "${var.project_name}-pipeline"
  role_arn = aws_iam_role.codepipeline_role.arn

  artifact_store {
    location = aws_s3_bucket.codepipeline_artifacts.bucket
    type     = "S3"
  }

  # Source Stage - GitHub
  stage {
    name = "Source"

    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        ConnectionArn    = aws_codestarconnections_connection.github.arn
        FullRepositoryId = var.github_repository  # e.g., "renuka-dalal/track-insight"
        BranchName       = var.github_branch      # e.g., "integration/aws"
      }
    }
  }

  # Build Stage - Backend and Frontend in parallel
  stage {
    name = "Build"

    action {
      name             = "Build_Backend"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      input_artifacts  = ["source_output"]
      output_artifacts = ["backend_build_output"]
      version          = "1"

      configuration = {
        ProjectName = aws_codebuild_project.backend.name
      }
    }

    action {
      name             = "Build_Frontend"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      input_artifacts  = ["source_output"]
      output_artifacts = ["frontend_build_output"]
      version          = "1"

      configuration = {
        ProjectName = aws_codebuild_project.frontend.name
      }
    }
  }

  # Deploy Stage - Update ECS services
  stage {
    name = "Deploy"

    action {
      name            = "Deploy_Backend"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "ECS"
      input_artifacts = ["backend_build_output"]
      version         = "1"

      configuration = {
        ClusterName = aws_ecs_cluster.main.name
        ServiceName = aws_ecs_service.backend.name
        FileName    = "imagedefinitions-backend.json"
      }
    }

    action {
      name            = "Deploy_Frontend"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "ECS"
      input_artifacts = ["frontend_build_output"]
      version         = "1"

      configuration = {
        ClusterName = aws_ecs_cluster.main.name
        ServiceName = aws_ecs_service.frontend.name
        FileName    = "imagedefinitions-frontend.json"
      }
    }
  }

  tags = {
    Name = "${var.project_name}-pipeline"
  }
}

# Outputs
output "codepipeline_url" {
  description = "CodePipeline console URL"
  value       = "https://console.aws.amazon.com/codesuite/codepipeline/pipelines/${aws_codepipeline.main.name}/view"
}

output "github_connection_arn" {
  description = "GitHub connection ARN (needs manual activation)"
  value       = aws_codestarconnections_connection.github.arn
}
