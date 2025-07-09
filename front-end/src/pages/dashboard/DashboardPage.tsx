import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
    Activity,
    Thermometer,
    Droplet,
    Sun,
    Moon,
    Calendar,
    Clock,
    TrendingUp,
    AlertCircle,
    CheckCircle
} from "lucide-react"
import { useDashboard, valueBases } from "./DashboardContext";
import Header from "./components/Header"
import StatsCards from "./components/StatsCards"
import TabsComponent from "./components/tabs"

export default function DashboardPage() {
    const { data } = useDashboard();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                <Header />
                <StatsCards />


                <TabsComponent />
            </div>
        </div>
    );
}