# Agents: marathon

## Coordinator Config

```yaml
model_tier: cheap
cycle_interval_minutes: 120
max_tasks_per_cycle: 5
```

## Worker Pool Config

```yaml
max_concurrent_workers: 2
default_model_tier: free
allowed_mcp_servers: [filesystem, postgres]
```

## Active Agents
<!-- Coordinator-maintained -->
None — awaiting business-orchestrator Phase 1 deployment.
