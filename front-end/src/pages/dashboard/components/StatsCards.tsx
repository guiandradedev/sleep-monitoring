import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Thermometer,
    Droplet,
    Sun,
} from "lucide-react"
import { useDashboard, valueBases } from "../DashboardContext";

export default function StatsCards() {
    const { overallMetrics } = useDashboard();
    

    const isTemperatureIdeal = overallMetrics.temperature.avg >= valueBases.temperature.idealRange[0] && overallMetrics.temperature.avg <= valueBases.temperature.idealRange[1];
    const isHumidityComfortable = overallMetrics.humidity.avg >= valueBases.humidity.idealRange[0] && overallMetrics.humidity.avg <= valueBases.humidity.idealRange[1];
    const isLuminosityLow = overallMetrics.luminosity.avg < valueBases.luminosity.idealRange[1];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Sleep Quality */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-green-800">
                        Luminosidade
                    </CardTitle>
                    <Sun className="w-5 h-5 text-green-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-green-900">
                        {overallMetrics.luminosity.avg.toFixed(2)} lux
                    </div>
                    <p className="text-xs text-green-900 mt-1">
                        {isLuminosityLow ? "Ideal para o sono" : "Ajuste necessário" + ` ${overallMetrics.luminosity.avg > valueBases.luminosity.idealRange[0] ? " (Alta)" : " (Baixa)"}`}
                    </p>
                </CardContent>
            </Card>

            {/* Temperature */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-orange-800">
                        Temperatura
                    </CardTitle>
                    <Thermometer className="w-5 h-5 text-orange-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-orange-900">
                        {overallMetrics.temperature.avg.toFixed(2)}°C
                    </div>
                    <p className="text-xs text-orange-600 mt-1">
                        {isTemperatureIdeal ? "Ideal para o sono" : "Ajuste necessário" + ` ${overallMetrics.temperature.avg > valueBases.temperature.idealRange[0] ? " (Alta)" : " (Baixa)"}`}
                    </p>
                </CardContent>
            </Card>

            {/* Humidity */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-cyan-50 to-cyan-100">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-cyan-800">
                        Umidade
                    </CardTitle>
                    <Droplet className="w-5 h-5 text-cyan-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-cyan-900">
                        {Math.floor(overallMetrics.humidity.avg)}%
                    </div>
                    <p className="text-xs text-cyan-600 mt-1">
                        {isHumidityComfortable ? "Nível confortável" : "Ajuste necessário" + ` ${overallMetrics.humidity.avg > valueBases.humidity.idealRange[0] ? " (Alta)" : " (Baixa)"}`}
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}