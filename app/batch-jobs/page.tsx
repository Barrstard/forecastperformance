import { BatchJobsWidget } from '@/components/dashboard/BatchJobsWidget'

export default function BatchJobsPage() {
  return (
    <div className="space-glass">
      <div className="glass-card dark:glass-card-dark p-6 rounded-glass shadow-glass border-white/20">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Batch Jobs</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage UKG Pro Workforce Management batch jobs
          </p>
        </div>
        
        <div className="grid gap-6">
          <BatchJobsWidget />
        </div>
      </div>
    </div>
  )
} 