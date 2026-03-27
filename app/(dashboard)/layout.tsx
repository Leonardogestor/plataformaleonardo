import { StrategicSidebar } from "@/components/sidebar/strategic-sidebar"
import { Topbar } from "@/components/topbar"
import { DashboardProvider } from "@/contexts/dashboard-context"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <div className="flex h-screen bg-background">
        <StrategicSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-6">
            <Topbar />
            {children}
          </div>
        </main>
      </div>
    </DashboardProvider>
  )
}
