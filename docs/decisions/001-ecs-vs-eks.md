# ADR-001: ECS Fargate and EKS Both Implemented for Container Orchestration

## Context

Track Insight is a containerised, multi-service application that needs a production-ready orchestration strategy on AWS. I had two competing priorities: operational simplicity (minimise infrastructure management overhead) and portability (retain the option to move workloads between cloud providers or adopt Kubernetes-ecosystem tooling as the project grows). These goals are in tension — ECS is simpler to operate on AWS but is AWS-proprietary, while EKS provides full Kubernetes at higher operational cost.

## Decision

Both deployment targets were implemented:

- **ECS Fargate** — primary production deployment. Fargate abstracts away node management entirely; tasks are defined in ECS task definitions and scaled independently. No EC2 instances to patch or right-size.
- **EKS** — second path via Kubernetes manifests in `k8s-manifests/`. Used when Kubernetes-native tooling or multi-cloud portability is required.

The Dockerfiles and application configuration are identical between both paths — only the orchestration layer differs.

## Alternatives Considered

| Option | Why rejected |
|---|---|
| **ECS only** | Acceptable short-term, but creates AWS lock-in. Migration to Kubernetes later is expensive. |
| **EKS only** | Higher operational cost as the sole path: node groups, cluster add-ons, IAM complexity outweigh the benefits at this scale. |
| **AWS Lambda** | Stateful services (Postgres, long-running agent calls up to 60s) are a poor fit for Lambda's execution model. |

## Consequences

| **Positive** | **Negative** |
|---|---|
| ECS Fargate is production-ready with minimal operational overhead — no EC2 instances to manage. | Maintaining two infrastructure paths requires discipline to keep them in sync. |
| EKS manifests provide a migration path if I later standardise on Kubernetes. | EKS add-on versions (CNI, CoreDNS, kube-proxy) need periodic attention. |
| Both paths use the same container images, avoiding divergence in application code. | CI/CD pipelines are more complex when targeting two orchestration systems. |
