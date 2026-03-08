targetScope = 'subscription'

param environmentName string
param location string = deployment().location

@secure()
param jwtSecret string

@secure()
param stripeSecretKey string
@secure()
param stripeWebhookSecret string
param stripePriceProId string
param stripePriceEnterpriseId string

var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var tags = { 'azd-env-name': environmentName }

// Resource Group
resource rg 'Microsoft.Resources/resourceGroups@2022-09-01' = {
  name: 'rg-${environmentName}'
  location: location
  tags: tags
}

// Log Analytics Workspace
module logAnalytics 'br/public:avm/res/operational-insights/workspace:0.3.4' = {
  name: 'logAnalytics'
  scope: rg
  params: {
    name: 'law-${resourceToken}'
    location: location
    tags: tags
  }
}

// Container Registry
module acr 'br/public:avm/res/container-registry/registry:0.1.1' = {
  name: 'acr'
  scope: rg
  params: {
    name: 'acr${resourceToken}'
    location: location
    acrSku: 'Basic'
    tags: tags
    adminUserEnabled: true
  }
}

// Container Apps Environment
module acaEnv 'br/public:avm/res/app/managed-environment:0.4.3' = {
  name: 'acaEnv'
  scope: rg
  params: {
    name: 'cae-${resourceToken}'
    location: location
    logAnalyticsWorkspaceResourceId: logAnalytics.outputs.resourceId
    tags: tags
  }
}

// Service: Postgres
module postgres 'br/public:avm/res/app/container-app:0.8.0' = {
  name: 'postgres'
  scope: rg
  params: {
    name: 'ca-postgres'
    location: location
    environmentResourceId: acaEnv.outputs.resourceId
    tags: union(tags, { 'azd-service-name': 'postgres' })
    containers: [
      {
        name: 'postgres'
        image: 'postgres:15-alpine'
        env: [
          { name: 'POSTGRES_USER', value: 'user' }
          { name: 'POSTGRES_PASSWORD', value: 'password' }
          { name: 'POSTGRES_DB', value: 'jobaggDB' }
        ]
        resources: {
          cpu: 1
          memory: '2.0Gi'
        }
      }
    ]
    ingressTargetPort: 5432
    ingressExternal: false
  }
}

// Service: Redis
module redis 'br/public:avm/res/app/container-app:0.8.0' = {
  name: 'redis'
  scope: rg
  params: {
    name: 'ca-redis'
    location: location
    environmentResourceId: acaEnv.outputs.resourceId
    tags: union(tags, { 'azd-service-name': 'redis' })
    containers: [
      {
        name: 'redis'
        image: 'redis:7-alpine'
        resources: {
          cpu: 0.25
          memory: '0.5Gi'
        }
      }
    ]
    ingressTargetPort: 6379
    ingressExternal: false
  }
}

// Service: API
module api 'br/public:avm/res/app/container-app:0.8.0' = {
  name: 'api'
  scope: rg
  params: {
    name: 'ca-api'
    location: location
    environmentResourceId: acaEnv.outputs.resourceId
    tags: union(tags, { 'azd-service-name': 'api' })
    containers: [
      {
        name: 'api'
        image: 'ghcr.io/azure/azure-developer-cli/frontend:latest' // Placeholder, replaced by azd
        env: [
          { name: 'NODE_ENV', value: 'production' }
          { name: 'PORT', value: '3001' }
          { name: 'DATABASE_URL', value: 'postgres://user:password@ca-postgres:5432/jobaggDB' }
          { name: 'REDIS_URL', value: 'redis://ca-redis:6379' }
          { name: 'JWT_SECRET', secretRef: 'jwt-secret' }
          { name: 'STRIPE_SECRET_KEY', secretRef: 'stripe-secret-key' }
          { name: 'STRIPE_WEBHOOK_SECRET', secretRef: 'stripe-webhook-secret' }
          { name: 'STRIPE_PRICE_PRO_ID', value: stripePriceProId }
          { name: 'STRIPE_PRICE_ENTERPRISE_ID', value: stripePriceEnterpriseId }
          // We will set FRONTEND_URL and CORS_ORIGIN below based on Web's URI
        ]
        resources: {
          cpu: 1
          memory: '2.0Gi'
        }
      }
    ]
    secrets: {
      secureList: [
        { name: 'jwt-secret', value: jwtSecret }
        { name: 'stripe-secret-key', value: stripeSecretKey }
        { name: 'stripe-webhook-secret', value: stripeWebhookSecret }
      ]
    }
    ingressTargetPort: 3001
    ingressExternal: true
  }
}

// Service: Web
module web 'br/public:avm/res/app/container-app:0.8.0' = {
  name: 'web'
  scope: rg
  params: {
    name: 'ca-web'
    location: location
    environmentResourceId: acaEnv.outputs.resourceId
    tags: union(tags, { 'azd-service-name': 'web' })
    containers: [
      {
        name: 'web'
        image: 'ghcr.io/azure/azure-developer-cli/frontend:latest' // Placeholder
        env: [
          { name: 'NODE_ENV', value: 'production' }
          { name: 'PORT', value: '3000' }
          { name: 'NEXT_PUBLIC_API_URL', value: 'https://${api.outputs.fqdn}' }
        ]
        resources: {
          cpu: 1
          memory: '2.0Gi'
        }
      }
    ]
    ingressTargetPort: 3000
    ingressExternal: true
  }
}

// Fixup API with Frontend URL
// A dedicated module simply to patch the API now that we know the Web URL
module apiPatch 'br/public:avm/res/app/container-app:0.8.0' = {
  name: 'apiPatch'
  scope: rg
  params: {
    name: 'ca-api'
    location: location
    environmentResourceId: acaEnv.outputs.resourceId
    tags: union(tags, { 'azd-service-name': 'api' })
    containers: [
      {
        name: 'api'
        image: 'ghcr.io/azure/azure-developer-cli/frontend:latest' // Placeholder
        env: [
          { name: 'NODE_ENV', value: 'production' }
          { name: 'PORT', value: '3001' }
          { name: 'DATABASE_URL', value: 'postgres://user:password@ca-postgres:5432/jobaggDB' }
          { name: 'REDIS_URL', value: 'redis://ca-redis:6379' }
          { name: 'JWT_SECRET', secretRef: 'jwt-secret' }
          { name: 'STRIPE_SECRET_KEY', secretRef: 'stripe-secret-key' }
          { name: 'STRIPE_WEBHOOK_SECRET', secretRef: 'stripe-webhook-secret' }
          { name: 'STRIPE_PRICE_PRO_ID', value: stripePriceProId }
          { name: 'STRIPE_PRICE_ENTERPRISE_ID', value: stripePriceEnterpriseId }
          { name: 'FRONTEND_URL', value: 'https://${web.outputs.fqdn}' }
          { name: 'CORS_ORIGIN', value: 'https://${web.outputs.fqdn}' }
        ]
      }
    ]
    secrets: {
      secureList: [
        { name: 'jwt-secret', value: jwtSecret }
        { name: 'stripe-secret-key', value: stripeSecretKey }
        { name: 'stripe-webhook-secret', value: stripeWebhookSecret }
      ]
    }
    ingressTargetPort: 3001
    ingressExternal: true
  }
}

output WEB_URI string = 'https://${web.outputs.fqdn}'
output API_URI string = 'https://${api.outputs.fqdn}'
