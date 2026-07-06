# Alfares Auth Boundary Scan

Date: 2026-07-06

Scope: source-only heuristic scan under `/home/ssf/Documents/Github`, excluding tests, build outputs, node_modules, and large files.

Purpose: identify services where marathon-only Auth users may be accepted by generic authentication despite having no non-Marathon roles.

## Summary

- generic-auth-risk: 3
- mixed-auth-review: 18
- needs-review-auth-without-role-signal: 3
- no-auth-signal: 9
- role-or-entitlement-signal: 2

## High-Priority Generic Auth Risks

### catalog-microservice

Strong generic signals:

- `catalog:authenticated` src/auth/catalog-auth.guard.ts:69 - `requiredRoles.includes('catalog:authenticated') ||`
- `catalog:authenticated` src/bpcp-events/bpcp-discount-eligibility.controller.ts:19 - `@RequireCatalogRoles('catalog:authenticated')`
- `catalog:authenticated` src/bundles/bundles.controller.ts:24 - `@RequireCatalogRoles('catalog:authenticated')`
- `catalog:authenticated` src/bundles/bundles.controller.ts:32 - `@RequireCatalogRoles('catalog:authenticated')`
- `catalog:authenticated` src/catalog-access/catalog-access.controller.ts:20 - `@RequireCatalogRoles('catalog:authenticated')`
- `catalog:authenticated` src/product-relations/product-relations.controller.ts:24 - `@RequireCatalogRoles('catalog:authenticated')`
- `catalog:authenticated` src/product-relations/product-relations.controller.ts:81 - `@RequireCatalogRoles('catalog:authenticated')`
- `catalog:authenticated` src/products/products.controller.ts:56 - `@RequireCatalogRoles('catalog:authenticated')`
- `catalog:authenticated` src/products/products.controller.ts:79 - `@RequireCatalogRoles('catalog:authenticated')`
- `catalog:authenticated` src/products/products.controller.ts:104 - `@RequireCatalogRoles('catalog:authenticated')`
- `catalog:authenticated` src/products/products.controller.ts:124 - `@RequireCatalogRoles('catalog:authenticated')`
- `catalog:authenticated` src/products/products.controller.ts:137 - `@RequireCatalogRoles('catalog:authenticated')`

Role/entitlement signals nearby in repo:

- `app-role` scripts/verify-goal24-refund-cancel-rollback-execution-approval.js:238 - `const historicalAuthActorConfirmationBlocker = '[MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:supera`
- `global-role` scripts/verify-goal24-refund-cancel-rollback-execution-approval.js:238 - `const historicalAuthActorConfirmationBlocker = '[MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:supera`
- `app-role` scripts/verify-goal24-refund-cancel-rollback-execution-approval.js:286 - `'[RESOLVED/NARROWED: sanitized Auth readback found one active verified Goal 24 actor hash 4215870ba488de17 with app:flipflop-service:admin and no token/raw email/user id output]',`
- `app-role` scripts/verify-goal24-refund-cancel-rollback-execution-approval.js:539 - `'[RESOLVED/NARROWED: sanitized Auth readback found one active verified Goal 24 actor hash 4215870ba488de17 with app:flipflop-service:admin and no token/raw email/user id output]',`
- `global-role` services/frontend/lib/catalogAccess.ts:9 - `"global:superadmin",`
- `global-role` services/frontend/lib/catalogAccess.ts:10 - `"global:platform_admin",`
- `app-role` services/frontend/lib/catalogAccess.ts:11 - `"app:catalog-microservice:admin",`
- `internal-role` services/frontend/lib/catalogAccess.ts:12 - `"internal:catalog-microservice:admin",`

### invoices-microservice

Strong generic signals:

- `CustomerAuthGuard` src/common/customer-auth.guard.ts:15 - `export class CustomerAuthGuard implements CanActivate {`
- `CustomerAuthGuard` src/common/customer-auth.guard.ts:62 - `this.logger.warn('Customer auth validation failed', 'CustomerAuthGuard', {`
- `CustomerAuthGuard` src/invoices/invoices.controller.ts:3 - `import { CustomerAuthGuard, CustomerAuthUser } from '../common/customer-auth.guard';`
- `CustomerAuthGuard` src/invoices/invoices.controller.ts:32 - `@UseGuards(CustomerAuthGuard)`
- `CustomerAuthGuard` src/invoices/invoices.controller.ts:43 - `@UseGuards(CustomerAuthGuard)`
- `CustomerAuthGuard` src/invoices/invoices.module.ts:17 - `import { CustomerAuthGuard } from '../common/customer-auth.guard';`
- `CustomerAuthGuard` src/invoices/invoices.module.ts:34 - `CustomerAuthGuard,`

Role/entitlement signals nearby in repo:

- none

### orders-microservice

Strong generic signals:

- `authenticated:user` scripts/verify-order-lifecycle-read-model.js:277 - `assert.equal(ORDER_CUSTOMER_LIFECYCLE_READ_ROLES.includes('authenticated:user'), true);`
- `authenticated:user` scripts/verify-order-lifecycle-read-model.js:305 - `assert.match(guardSource, /authenticated:user/);`
- `authenticated:user` src/auth/jwt-roles.guard.ts:60 - `|| (r === 'authenticated:user' && !isInternalService)`
- `authenticated:user` src/orders/orders.controller.ts:60 - `'authenticated:user',`

Role/entitlement signals nearby in repo:

- `internal-role` scripts/verify-admin-operations-console.js:91 - `const overview = await service.getOperationsOverview({ roles: ['internal:orders-microservice:admin'] });`
- `internal-role` scripts/verify-admin-operations-console.js:95 - `assert.equal(overview.mode.allowedReadRoles.includes('internal:orders-microservice:admin'), true);`
- `internal-role` scripts/verify-admin-operations-console.js:106 - `const readOnlyCatalog = service.getActionCatalog({ roles: ['internal:orders-microservice:admin'] });`
- `internal-role` scripts/verify-admin-operations-console.js:110 - `() => service.applyOrderStatusAction({ orderId: 'order-1', status: 'processing' }, { roles: ['internal:orders-microservice:admin'] }),`
- `roles-decorator` scripts/verify-admin-operations-console.js:173 - `assert.match(controllerSource, /@Roles\(\.\.\.ADMIN_READ_ROLES\)/);`
- `roles-decorator` scripts/verify-admin-operations-console.js:174 - `assert.match(controllerSource, /@Roles\(\.\.\.ADMIN_ACTION_ROLES\)/);`
- `internal-role` scripts/verify-channel-lifecycle-runtime-evidence.js:451 - `'shipment provider runtime correlation and Warehouse -> Orders callback are proven through an approved bounded sanitized smoke; the Auth-issued internal:allegro-service:service tok`
- `app-role` scripts/verify-channel-lifecycle-runtime-evidence.js:635 - `['runtime.minimalRole', 'app:aukro-service:admin'],`


## Mixed Auth Review

### ai-microservice

Auth validation hints:

- `AuthValidateCall` src/admin/admin-auth.service.ts:48 - `const user = await this.validateToken(token);`
- `AuthValidateCall` src/admin/admin-auth.service.ts:62 - `private async validateToken(token: string): Promise<AdminUser> {`
- `AuthValidateCall` src/admin/admin-auth.service.ts:64 - `const response = await fetch('${authServiceUrl.replace(/\/$/, '')}/auth/validate', {`

Role/entitlement signals:

- `global-role` src/admin/admin-auth.service.ts:17 - `'global:superadmin',`
- `global-role` src/admin/admin-auth.service.ts:18 - `'global:platform_admin',`
- `app-role` src/admin/admin-auth.service.ts:20 - `'app:ai-microservice:admin',`
- `app-role` src/admin/admin-auth.service.ts:21 - `'app:ai:admin',`

### allegro

Auth validation hints:

- `JwtAuthGuardOnlyHint` services/allegro-service/src/allegro/admin-users/admin-users.controller.ts:31 - `@UseGuards(JwtAuthGuard)`
- `JwtAuthGuardOnlyHint` services/allegro-service/src/allegro/catalog-sell-action/catalog-sell-action.controller.ts:13 - `@UseGuards(JwtAuthGuard)`
- `JwtAuthGuardOnlyHint` services/allegro-service/src/allegro/categories/categories.controller.ts:20 - `@UseGuards(JwtAuthGuard)`
- `JwtAuthGuardOnlyHint` services/allegro-service/src/allegro/categories/categories.controller.ts:27 - `@UseGuards(JwtAuthGuard)`
- `JwtAuthGuardOnlyHint` services/allegro-service/src/allegro/categories/categories.controller.ts:34 - `@UseGuards(JwtAuthGuard)`
- `JwtAuthGuardOnlyHint` services/allegro-service/src/allegro/oauth/oauth.controller.ts:110 - `@UseGuards(JwtAuthGuard)`

Role/entitlement signals:

- `roles-decorator` services/allegro-service/src/allegro/admin-users/admin-users.controller.ts:2 - `import { JwtAuthGuard, Roles, RolesGuard } from '@allegro/shared';`
- `roles-decorator` services/allegro-service/src/allegro/admin-users/admin-users.controller.ts:6 - `@UseGuards(JwtAuthGuard, RolesGuard)`
- `app-role` services/allegro-service/src/allegro/admin-users/admin-users.controller.ts:7 - `@Roles('global:superadmin', 'app:allegro-service:admin')`
- `global-role` services/allegro-service/src/allegro/admin-users/admin-users.controller.ts:7 - `@Roles('global:superadmin', 'app:allegro-service:admin')`
- `roles-decorator` services/allegro-service/src/allegro/admin-users/admin-users.controller.ts:7 - `@Roles('global:superadmin', 'app:allegro-service:admin')`
- `roles-decorator` services/allegro-service/src/allegro/offers/offers.controller.ts:23 - `import { JwtAuthGuard, RolesGuard, Roles, LoggerService, MetricsService } from '@allegro/shared';`

### aukro

Auth validation hints:

- `JwtAuthGuardOnlyHint` services/api-gateway/src/gateway/gateway.controller.ts:101 - `@UseGuards(JwtAuthGuard)`
- `JwtAuthGuardOnlyHint` services/api-gateway/src/gateway/gateway.controller.ts:111 - `@UseGuards(JwtAuthGuard)`
- `JwtAuthGuardOnlyHint` services/api-gateway/src/gateway/gateway.controller.ts:123 - `@UseGuards(JwtAuthGuard)`
- `JwtAuthGuardOnlyHint` services/api-gateway/src/gateway/gateway.controller.ts:130 - `@UseGuards(JwtAuthGuard)`
- `JwtAuthGuardOnlyHint` services/aukro-service/src/aukro/accounts/accounts.controller.ts:6 - `@UseGuards(JwtAuthGuard)`
- `JwtAuthGuardOnlyHint` services/aukro-service/src/aukro/executor/executor.controller.ts:22 - `@UseGuards(JwtAuthGuard)`

Role/entitlement signals:

- `global-role` services/aukro-service/src/aukro/orders/orders.service.ts:18 - `'global:superadmin',`
- `global-role` services/aukro-service/src/aukro/orders/orders.service.ts:19 - `'global:platform_admin',`
- `app-role` services/aukro-service/src/aukro/orders/orders.service.ts:20 - `'app:aukro-service:admin',`
- `app-role` services/aukro-service/src/aukro/orders/orders.service.ts:21 - `'app:aukro:admin',`
- `app-role` services/aukro-service/src/ui/ui.controller.ts:997 - `|| roles.has('app:aukro-service:admin')`

### auth-microservice

Auth validation hints:

- `JwtAuthGuardOnlyHint` src/auth/admin-users.controller.ts:24 - `@UseGuards(JwtAuthGuard)`
- `AuthValidateCall` src/auth/auth.controller.ts:49 - `async validateToken(@Body() validateTokenDto: ValidateTokenDto) {`
- `AuthValidateCall` src/auth/auth.controller.ts:50 - `const user = await this.authService.validateToken(validateTokenDto.token);`
- `JwtAuthGuardOnlyHint` src/auth/auth.controller.ts:70 - `@UseGuards(JwtAuthGuard)`
- `JwtAuthGuardOnlyHint` src/auth/auth.controller.ts:76 - `@UseGuards(JwtAuthGuard)`
- `JwtAuthGuardOnlyHint` src/auth/auth.controller.ts:82 - `@UseGuards(JwtAuthGuard)`

Role/entitlement signals:

- `app-role` scripts/assign-role-by-email.ts:4 - `* Use after seed: run once to give a user global:superadmin, app:shop-assistant:admin,`
- `global-role` scripts/assign-role-by-email.ts:4 - `* Use after seed: run once to give a user global:superadmin, app:shop-assistant:admin,`
- `internal-role` scripts/assign-role-by-email.ts:5 - `* or internal:warehouse-microservice:admin.`
- `global-role` scripts/assign-role-by-email.ts:7 - `* Usage: npx ts-node scripts/assign-role-by-email.ts --email=user@example.com --role=global:superadmin`
- `app-role` scripts/assign-role-by-email.ts:8 - `*        npx ts-node scripts/assign-role-by-email.ts --email=user@example.com --role=app:shop-assistant:admin`
- `internal-role` scripts/assign-role-by-email.ts:9 - `*        npx ts-node scripts/assign-role-by-email.ts --email=service@example.com --role=internal:warehouse-microservice:admin --dry-run`

### auth-microservice-goal11-deploy

Auth validation hints:

- `JwtAuthGuardOnlyHint` src/auth/admin-users.controller.ts:24 - `@UseGuards(JwtAuthGuard)`
- `AuthValidateCall` src/auth/auth.controller.ts:47 - `async validateToken(@Body() validateTokenDto: ValidateTokenDto) {`
- `AuthValidateCall` src/auth/auth.controller.ts:48 - `const user = await this.authService.validateToken(validateTokenDto.token);`
- `JwtAuthGuardOnlyHint` src/auth/auth.controller.ts:68 - `@UseGuards(JwtAuthGuard)`
- `JwtAuthGuardOnlyHint` src/auth/auth.controller.ts:74 - `@UseGuards(JwtAuthGuard)`
- `JwtAuthGuardOnlyHint` src/auth/auth.controller.ts:90 - `@UseGuards(JwtAuthGuard)`

Role/entitlement signals:

- `app-role` scripts/assign-role-by-email.ts:4 - `* Use after seed: run once to give a user global:superadmin, app:shop-assistant:admin,`
- `global-role` scripts/assign-role-by-email.ts:4 - `* Use after seed: run once to give a user global:superadmin, app:shop-assistant:admin,`
- `internal-role` scripts/assign-role-by-email.ts:5 - `* or internal:warehouse-microservice:admin.`
- `global-role` scripts/assign-role-by-email.ts:7 - `* Usage: npx ts-node scripts/assign-role-by-email.ts --email=user@example.com --role=global:superadmin`
- `app-role` scripts/assign-role-by-email.ts:8 - `*        npx ts-node scripts/assign-role-by-email.ts --email=user@example.com --role=app:shop-assistant:admin`
- `internal-role` scripts/assign-role-by-email.ts:9 - `*        npx ts-node scripts/assign-role-by-email.ts --email=service@example.com --role=internal:warehouse-microservice:admin --dry-run`

### bazos

Auth validation hints:

- `JwtAuthGuardOnlyHint` scripts/verify-bazos-provider-proof-boundary.js:40 - `"@UseGuards(JwtAuthGuard)",`
- `JwtAuthGuardOnlyHint` services/api-gateway/src/gateway/gateway.controller.ts:101 - `@UseGuards(JwtAuthGuard)`
- `JwtAuthGuardOnlyHint` services/api-gateway/src/gateway/gateway.controller.ts:111 - `@UseGuards(JwtAuthGuard)`
- `JwtAuthGuardOnlyHint` services/api-gateway/src/gateway/gateway.controller.ts:123 - `@UseGuards(JwtAuthGuard)`
- `JwtAuthGuardOnlyHint` services/api-gateway/src/gateway/gateway.controller.ts:130 - `@UseGuards(JwtAuthGuard)`
- `JwtAuthGuardOnlyHint` services/aukro-service/src/aukro/accounts/accounts.controller.ts:6 - `@UseGuards(JwtAuthGuard)`

Role/entitlement signals:

- `global-role` services/aukro-service/src/aukro/orders/orders.service.ts:16 - `'global:superadmin',`
- `global-role` services/aukro-service/src/aukro/orders/orders.service.ts:17 - `'global:platform_admin',`
- `app-role` services/aukro-service/src/aukro/orders/orders.service.ts:18 - `'app:bazos-service:admin',`
- `app-role` services/aukro-service/src/aukro/orders/orders.service.ts:19 - `'app:bazos:admin',`
- `global-role` services/aukro-service/src/ui/ui.controller.ts:7 - `const ADMIN_GLOBAL_ROLES = new Set(['global:admin', 'global:superadmin', 'global:platform_admin']);`

### flipflop

Auth validation hints:

- `JwtAuthGuardOnlyHint` services/api-gateway/src/gateway/gateway.controller.ts:112 - `@UseGuards(JwtAuthGuard)`
- `JwtAuthGuardOnlyHint` services/api-gateway/src/gateway/gateway.controller.ts:123 - `@UseGuards(JwtAuthGuard)`
- `JwtAuthGuardOnlyHint` services/api-gateway/src/gateway/gateway.controller.ts:170 - `@UseGuards(JwtAuthGuard)`
- `JwtAuthGuardOnlyHint` services/api-gateway/src/gateway/gateway.controller.ts:181 - `@UseGuards(JwtAuthGuard)`
- `JwtAuthGuardOnlyHint` services/api-gateway/src/gateway/gateway.controller.ts:191 - `@UseGuards(JwtAuthGuard)`
- `JwtAuthGuardOnlyHint` services/api-gateway/src/gateway/gateway.controller.ts:201 - `@UseGuards(JwtAuthGuard)`

Role/entitlement signals:

- `internal-role` scripts/generate-seo-drafts.js:44 - `roles: ['catalog:write', 'internal:catalog-microservice:admin'],`
- `roles-decorator` scripts/verify-paid-provider-bundle-checkout-gate.js:441 - `'RolesGuard',`
- `roles-decorator` scripts/verify-paid-provider-bundle-checkout-gate.js:471 - `assert(read('services/order-service/src/marketing/marketing.controller.ts').includes('@UseGuards(JwtAuthGuard, RolesGuard)'), 'discount code generation endpoint must remain guarded`
- `app-role` scripts/verify-paid-provider-bundle-checkout-gate.js:550 - `'[RESOLVED/NARROWED: guarded Goal 24 discount-code generation must use an Auth-issued user access token carrying global:superadmin or app:flipflop-service:admin; service tokens/API`
- `global-role` scripts/verify-paid-provider-bundle-checkout-gate.js:550 - `'[RESOLVED/NARROWED: guarded Goal 24 discount-code generation must use an Auth-issued user access token carrying global:superadmin or app:flipflop-service:admin; service tokens/API`
- `app-role` scripts/verify-paid-provider-bundle-checkout-gate.js:554 - `'[MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:superadmin]',`

### heureka

Auth validation hints:

- `JwtAuthGuardOnlyHint` services/api-gateway/src/gateway/gateway.controller.ts:102 - `@UseGuards(JwtAuthGuard)`
- `JwtAuthGuardOnlyHint` services/api-gateway/src/gateway/gateway.controller.ts:116 - `@UseGuards(JwtAuthGuard)`
- `JwtAuthGuardOnlyHint` services/api-gateway/src/gateway/gateway.controller.ts:128 - `@UseGuards(JwtAuthGuard)`
- `JwtAuthGuardOnlyHint` services/api-gateway/src/gateway/gateway.controller.ts:135 - `@UseGuards(JwtAuthGuard)`
- `JwtAuthGuardOnlyHint` services/api-gateway/src/gateway/gateway.controller.ts:142 - `@UseGuards(JwtAuthGuard)`
- `JwtAuthGuardOnlyHint` services/api-gateway/src/gateway/gateway.controller.ts:149 - `@UseGuards(JwtAuthGuard)`

Role/entitlement signals:

- `app-role` services/heureka-service/src/heureka/dashboard/dashboard-order-read-model.self-test.ts:79 - `const list = await service.listOrders({ id: 'admin-1', email: 'admin@example.test', roles: ['app:heureka-service:admin'] }, { limit: '10', status: 'all' });`
- `app-role` services/heureka-service/src/heureka/dashboard/dashboard-order-read-model.self-test.ts:94 - `const detail = await service.getOrderDetail({ id: 'admin-1', email: 'admin@example.test', roles: ['app:heureka-service:admin'] }, 'heureka-1');`
- `global-role` services/heureka-service/src/heureka/dashboard/dashboard.service.ts:65 - `'global:superadmin',`
- `global-role` services/heureka-service/src/heureka/dashboard/dashboard.service.ts:66 - `'global:platform_admin',`
- `app-role` services/heureka-service/src/heureka/dashboard/dashboard.service.ts:67 - `'app:heureka-service:admin',`
- `app-role` services/heureka-service/src/heureka/dashboard/dashboard.service.ts:68 - `'app:heureka:admin',`

### leads-microservice

Auth validation hints:

- `AuthValidateCall` src/auth/admin-auth.guard.ts:39 - `return baseUrl.replace(/\/$/, '') + '/auth/validate';`

Role/entitlement signals:

- `global-role` src/auth/admin-auth.guard.ts:15 - `'global:superadmin',`
- `app-role` src/auth/admin-auth.guard.ts:21 - `'app:leads:owner',`
- `app-role` src/auth/admin-auth.guard.ts:22 - `'app:leads:admin',`
- `internal-role` src/auth/admin-auth.guard.ts:26 - `'internal:leads:admin',`
- `app-role` src/auth/admin-auth.guard.ts:27 - `'app:shop-assistant:admin',`
- `app-role` src/auth/admin-auth.guard.ts:28 - `'app:buzzos:admin',`

### logging-microservice

Auth validation hints:

- `AuthValidateCall` src/auth/admin-role.guard.ts:37 - `const user = await this.validateToken(token);`
- `AuthValidateCall` src/auth/admin-role.guard.ts:51 - `private async validateToken(token: string): Promise<{ roles?: unknown }> {`
- `AuthValidateCall` src/auth/admin-role.guard.ts:55 - `const response = await fetch('${authServiceUrl}/auth/validate', {`
- `AuthValidateCall` src/auth/customer-log-read.guard.ts:48 - `const user = await this.validateToken(token);`
- `AuthValidateCall` src/auth/customer-log-read.guard.ts:147 - `private async validateToken(token: string): Promise<AuthenticatedLoggingUser> {`
- `AuthValidateCall` src/auth/customer-log-read.guard.ts:151 - `const response = await fetch(authServiceUrl + '/auth/validate', {`

Role/entitlement signals:

- `app-role` app.js:22 - `const adminRoles = ["global:superadmin", "app:logging-microservice:admin", "internal:logging-microservice:admin"];`
- `global-role` app.js:22 - `const adminRoles = ["global:superadmin", "app:logging-microservice:admin", "internal:logging-microservice:admin"];`
- `internal-role` app.js:22 - `const adminRoles = ["global:superadmin", "app:logging-microservice:admin", "internal:logging-microservice:admin"];`
- `app-role` app.js:51 - `permissions: ["logging.dashboard.read", "logging.logs.read", "logging.analysis.read", "app:logging-microservice:admin", "logging.notifications.manage"],`
- `entitlement` app.js:380 - `return accessDenied("Tenant scope required", "The session is authenticated but does not include customer_id or tenant_id.", "Ask the auth microservice to include a tenant-scoped en`
- `app-role` app.js:556 - `<p>Admin access granted by backend role <strong>app:logging-microservice:admin</strong>. Review services, errors, warnings, AI analysis, and notification integrations.</p>`

### marathon

Auth validation hints:

- `AuthValidateCall` src/registrations/registrations.controller.ts:81 - `const user = (await validateToken(token)) || validatePortalToken(token);`
- `AuthValidateCall` src/shared/auth-client.ts:37 - `* Validates JWT via auth-microservice POST /auth/validate.`
- `AuthValidateCall` src/shared/auth-client.ts:47 - `export async function validateToken(token: string): Promise<AuthUser | null> {`
- `AuthValidateCall` src/shared/auth-client.ts:51 - `const url = buildAuthUrl('/auth/validate');`
- `AuthValidateCall` src/shared/auth.guard.ts:19 - `let user = await validateToken(token);`

Role/entitlement signals:

- `app-role` scripts/apply-marathon-auth-reconciliation.js:107 - `auth: 'grant app:marathon:user and mark authSources.marathon for mapped Auth users; never removes roles',`
- `app-role` scripts/apply-marathon-auth-reconciliation.js:239 - `if (!appRole[0]) throw new Error("app:marathon:user role not found");`
- `app-role` scripts/dry-run-marathon-auth-reconciliation.js:84 - `authRole: 'app:marathon:user',`
- `app-role` scripts/dry-run-marathon-auth-reconciliation.js:365 - `"owner approval for Auth DB app:marathon:user assignment and authSources.marathon marker update",`

### marketing-microservice

Auth validation hints:

- `AuthValidateCall` src/admin-auth.ts:124 - `const path = process.env.AUTH_SESSION_VALIDATE_PATH || "/auth/validate";`

Role/entitlement signals:

- `global-role` src/admin-auth.ts:45 - `"global:platform_admin",`
- `internal-role` src/admin-auth.ts:46 - `"internal:marketing-microservice:admin"`
- `global-role` src/admin-auth.ts:53 - `"global:superadmin"`

### monitoring-microservice

Auth validation hints:

- `AuthValidateCall` src/auth/auth-consumer.service.ts:28 - `const response = await axios.post('${authUrl}/auth/validate', { token }, { timeout: 5000 });`

Role/entitlement signals:

- `app-role` src/config/configuration.ts:16 - `'global:superadmin,global:platform_admin,app:monitoring-microservice:admin,internal:monitoring-microservice:admin,monitoring:admin,app:monitoring:admin',`
- `global-role` src/config/configuration.ts:16 - `'global:superadmin,global:platform_admin,app:monitoring-microservice:admin,internal:monitoring-microservice:admin,monitoring:admin,app:monitoring:admin',`
- `internal-role` src/config/configuration.ts:16 - `'global:superadmin,global:platform_admin,app:monitoring-microservice:admin,internal:monitoring-microservice:admin,monitoring:admin,app:monitoring:admin',`

### notifications-microservice

Auth validation hints:

- `AuthValidateCall` src/guards/jwt-auth.guard.ts:45 - `'${authServiceUrl.replace(/\/$/, '')}/auth/validate',`

Role/entitlement signals:

- `roles-decorator` src/app.module.ts:18 - `import { JwtRolesGuard } from './auth/jwt-roles.guard';`
- `roles-decorator` src/app.module.ts:37 - `{ provide: APP_GUARD, useClass: JwtRolesGuard },`
- `roles-decorator` src/auth/auth.module.ts:3 - `import { JwtRolesGuard } from './jwt-roles.guard';`
- `roles-decorator` src/auth/auth.module.ts:12 - `providers: [JwtRolesGuard],`
- `roles-decorator` src/auth/auth.module.ts:13 - `exports: [JwtModule, JwtRolesGuard],`
- `roles-decorator` src/auth/jwt-roles.guard.ts:20 - `export class JwtRolesGuard implements CanActivate {`

### payments-microservice

Auth validation hints:

- `AuthValidateCall` scripts/check-hosted-auth-contract.js:51 - `check(authGuard.includes('/auth/validate'), 'backend guard calls Auth /auth/validate');`
- `AuthValidateCall` scripts/check-hosted-auth-contract.js:65 - `check(authProfileController.includes('/auth/validate'), 'profile controller validates token through Auth');`
- `AuthValidateCall` src/auth/auth-profile.controller.ts:56 - `response = await fetch('${authBaseUrl}/auth/validate', {`
- `AuthValidateCall` src/auth/jwt-roles.guard.ts:104 - `response = await fetch('${authBaseUrl}/auth/validate', {`

Role/entitlement signals:

- `global-role` public/payments-ui.js:251 - `? 'Payments admin API denied this session. Use an Auth account with global:superadmin or internal:payments-microservice:admin.'`
- `internal-role` public/payments-ui.js:251 - `? 'Payments admin API denied this session. Use an Auth account with global:superadmin or internal:payments-microservice:admin.'`
- `internal-role` scripts/verify-goal24-orders-token-runtime-evidence.js:26 - `includes(report, 'internal:payments-microservice:service', 'runtime report role');`
- `internal-role` scripts/verify-goal24-provider-rollback-contract.js:78 - `assert(tokenReport.includes('internal:payments-microservice:service'), 'runtime Orders service role evidence is missing');`
- `global-role` src/admin/admin-auth.ts:2 - `"global:superadmin",`
- `internal-role` src/admin/admin-auth.ts:3 - `"internal:payments-microservice:admin",`

### runlayer

Auth validation hints:

- `JwtAuthGuardOnlyHint` dashboard/dashboard.controller.ts:6 - `@UseGuards(JwtAuthGuard)`
- `AuthValidateCall` src/admin-page.controller.ts:34 - `const { data } = await this.http.post('/auth/validate', { token });`
- `AuthValidateCall` src/common/auth/jwt.guard.ts:43 - `const { data } = await this.http.post('/auth/validate', { token });`
- `AuthValidateCall` test/mvp-cycle.e2e-spec.ts:9 - `*   - auth-microservice /auth/validate → always valid`
- `AuthValidateCall` test/mvp-cycle.e2e-spec.ts:74 - `nock(AUTH_URL).post('/auth/validate').reply(200, { valid: true, userId: OWNER_ID }).persist();`

Role/entitlement signals:

- `app-role` src/admin-page.controller.ts:44 - `if (roles.includes('global:superadmin') || roles.includes('app:runlayer:admin')) {`
- `global-role` src/admin-page.controller.ts:44 - `if (roles.includes('global:superadmin') || roles.includes('app:runlayer:admin')) {`
- `app-role` src/common/auth/admin.guard.ts:13 - `const hasAdminRole = roles.includes('global:superadmin') || roles.includes('app:runlayer:admin');`
- `global-role` src/common/auth/admin.guard.ts:13 - `const hasAdminRole = roles.includes('global:superadmin') || roles.includes('app:runlayer:admin');`
- `global-role` src/common/auth/jwt.guard.ts:10 - `'global:superadmin',`
- `app-role` src/common/auth/jwt.guard.ts:11 - `'app:runlayer:admin',`

### shop-assistant

Auth validation hints:

- `AuthValidateCall` scripts/check-hosted-auth-contract.js:83 - `requireIncludes('src/auth/auth.service.ts', authService, '/auth/validate', 'backend Auth validation endpoint');`
- `AuthValidateCall` src/auth/auth.service.ts:3 - `* Validates JWT via auth-microservice POST /auth/validate`
- `AuthValidateCall` src/auth/auth.service.ts:28 - `async validateToken(token: string): Promise<AuthUser> {`
- `AuthValidateCall` src/auth/auth.service.ts:33 - `const url = '${this.authServiceUrl.replace(/\/$/, '')}/auth/validate';`
- `AuthValidateCall` src/auth/auth.service.ts:34 - `this.logging.debug('Validating token with auth-microservice', { url: url.replace(/\/[^/]*$/, '/auth/validate'), tokenLength: token?.length });`
- `AuthValidateCall` src/auth/jwt-auth.guard.ts:40 - `const user = await this.authService.validateToken(token);`

Role/entitlement signals:

- `roles-decorator` src/admin/ai-models.controller.ts:8 - `import { RolesGuard } from '../auth/roles.guard';`
- `roles-decorator` src/admin/ai-models.controller.ts:15 - `@UseGuards(JwtAuthGuard, RolesGuard)`
- `app-role` src/admin/ai-models.controller.ts:16 - `@Roles('global:superadmin', 'app:shop-assistant:admin')`
- `global-role` src/admin/ai-models.controller.ts:16 - `@Roles('global:superadmin', 'app:shop-assistant:admin')`
- `roles-decorator` src/admin/ai-models.controller.ts:16 - `@Roles('global:superadmin', 'app:shop-assistant:admin')`
- `roles-decorator` src/admin/operations.controller.ts:5 - `import { RolesGuard } from '../auth/roles.guard';`

### warehouse-microservice

Auth validation hints:

- `AuthValidateCall` scripts/check-hosted-auth-contract.js:54 - `has(authGuard, /\/auth\/validate/, 'guard targets Auth /auth/validate');`
- `AuthValidateCall` src/auth/jwt-roles.guard.ts:118 - `'${this.getAuthServiceUrl()}/auth/validate',`

Role/entitlement signals:

- `global-role` public/admin/app.js:14 - `const adminRoles = new Set(['global:superadmin', 'internal:warehouse-microservice:admin']);`
- `internal-role` public/admin/app.js:14 - `const adminRoles = new Set(['global:superadmin', 'internal:warehouse-microservice:admin']);`
- `app-role` scripts/verify-bundle-component-reservation-contract.js:132 - `'[MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:superadmin]',`
- `global-role` scripts/verify-bundle-component-reservation-contract.js:132 - `'[MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:superadmin]',`
- `roles-decorator` src/app.module.ts:12 - `import { JwtRolesGuard } from './auth/jwt-roles.guard';`
- `roles-decorator` src/app.module.ts:44 - `{ provide: APP_GUARD, useClass: JwtRolesGuard },`


## Notes

- This scan is not proof of deployed behavior; it is a source inventory to prioritize bounded guard patches.
- A service is safe for marathon-only users only when protected endpoints require app-specific role, entitlement, ownership, or a public/no-user path that exposes no private account data.
- Marathon itself remains intentionally identity-bound to `MarathonParticipant.userId` for profile/history access.
