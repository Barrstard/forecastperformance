"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useEnvironmentStore } from '@/stores/environment-store'
import { Plus, Database, Settings, Trash2, Edit } from 'lucide-react'

export default function EnvironmentsPage() {
  const router = useRouter()
  const { environments, setEnvironments, deleteEnvironment } = useEnvironmentStore()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchEnvironments()
  }, [])

  const fetchEnvironments = async () => {
    try {
      const response = await fetch('/api/environments')
      if (response.ok) {
        const data = await response.json()
        setEnvironments(data)
      }
    } catch (error) {
      console.error('Failed to fetch environments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this environment?')) {
      try {
        const response = await fetch(`/api/environments/${id}`, {
          method: 'DELETE'
        })
        if (response.ok) {
          deleteEnvironment(id)
        }
      } catch (error) {
        console.error('Failed to delete environment:', error)
      }
    }
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex flex-1 flex-col gap-6 p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Environments</h1>
          </div>
          <div className="text-center">Loading environments...</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Environments</h1>
            <p className="text-muted-foreground">
              Manage BigQuery and Dimensions connections
            </p>
          </div>
          <Button onClick={() => router.push('/environments/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Environment
          </Button>
        </div>

        {/* Environment List */}
        <div className="grid gap-4">
          {environments.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No environments configured</h3>
                  <p className="text-muted-foreground mb-4">
                    Get started by adding your first environment with BigQuery credentials.
                  </p>
                  <Button onClick={() => router.push('/environments/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Environment
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            environments.map((env) => (
              <Card key={env.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {env.name}
                        {env.isActive && (
                          <Badge variant="secondary">Active</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Project: {env.bigqueryProjectId}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/environments/${env.id}/edit`)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(env.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">BigQuery Project</div>
                      <div className="font-medium">{env.bigqueryProjectId}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Dataset</div>
                      <div className="font-medium">{env.bigqueryDataset}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">UKG Pro</div>
                      <div className="font-medium">
                        {env.ukgProUrl ? 'Configured' : 'Not configured'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Created</div>
                      <div className="font-medium">
                        {new Date(env.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  )
} 