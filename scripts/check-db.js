const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('Checking database...')
  
  // Check environments
  const environments = await prisma.environment.findMany()
  console.log('Environments:', environments.length)
  
  // Check forecast comparison models
  const models = await prisma.forecastComparisonModel.findMany({
    include: {
      environment: true
    }
  })
  console.log('Forecast Comparison Models:', models.length)
  
  if (models.length === 0) {
    console.log('No models found. Creating a test model...')
    
    // Get first environment or create one
    let environment = environments[0]
    if (!environment) {
      console.log('No environment found. Creating a test environment...')
      environment = await prisma.environment.create({
        data: {
          name: 'Test Environment',
          bigqueryProjectId: 'test-project',
          bigqueryDataset: 'test_dataset',
          bigqueryCredentials: '{}',
          ukgProUrl: 'https://test.ukg.com',
          ukgProCredentials: '{}'
        }
      })
    }
    
    // Create a test model
    const testModel = await prisma.forecastComparisonModel.create({
      data: {
        name: 'Test Model',
        description: 'A test forecast comparison model',
        environmentId: environment.id,
        period_start: new Date('2025-01-01'),
        period_end: new Date('2025-03-31'),
        status: 'DRAFT'
      },
      include: {
        environment: true
      }
    })
    
    console.log('Created test model:', testModel)
  } else {
    console.log('Existing models:')
    models.forEach(model => {
      console.log(`- ${model.name} (${model.id}) - ${model.status}`)
    })
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect()) 