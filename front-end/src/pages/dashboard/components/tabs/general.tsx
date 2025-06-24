import { useDashboard, valueBases } from "../../DashboardContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Activity,
    Thermometer,
    Droplet,
    Sun,
    Clock,
    AlertCircle,
    CheckCircle
} from "lucide-react"
import { TabsContent } from "@/components/ui/tabs"

const getStatusColor = (status: string) => {
    switch (status) {
        case 'ideal': return 'bg-green-100 text-green-800 border-green-200'
        case 'alerta': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
        case 'critico': return 'bg-red-100 text-red-800 border-red-200'
        default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
}

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'ideal': return <CheckCircle className="w-4 h-4" />
        case 'alerta': return <AlertCircle className="w-4 h-4" />
        case 'critico': return <AlertCircle className="w-4 h-4" />
        default: return <Activity className="w-4 h-4" />
    }
}

const getBadge = (status: boolean) => {
    if (status) {
        return <Badge className="bg-green-100 text-green-800 border-green-200">Ideal</Badge>
    } else {
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Em alerta</Badge>
        // bg-yellow-100 text-yellow-800 border-yellow-200
    }
}


export default function TabsGeneral() {
    const { data, overallMetrics } = useDashboard();

    const lastData = data[data.length - 1];
    if (!lastData) {
        return (
            <TabsContent value="overview" className="space-y-6">
                <Card className="border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle>Sem dados disponíveis</CardTitle>
                        <CardDescription>
                            Nenhuma leitura recente encontrada.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-slate-500">Por favor, verifique a conexão com os sensores.</p>
                    </CardContent>
                </Card>
            </TabsContent>
        );
    }
    const isLastTemperatureIdeal = lastData.temperature.avg >= valueBases.temperature.idealRange[0] && lastData.temperature.avg <= valueBases.temperature.idealRange[1];
    const isLastHumidityComfortable = lastData.humidity.avg >= valueBases.humidity.idealRange[0] && lastData.humidity.avg <= valueBases.humidity.idealRange[1];
    const isLastLuminosityLow = lastData.luminosity.avg < valueBases.luminosity.idealRange[1];

    return (
        <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Recent Readings */}
                <Card className="lg:col-span-2 border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="w-5 h-5" />
                            Leituras Recentes
                        </CardTitle>
                        <CardDescription>
                            Dados coletados durante a última noite
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data
                                .slice()
                                .sort((a, b) => b.timestamp - a.timestamp) // ordem decrescente (mais recente primeiro)
                                .map((reading, index) => {
                                    const isTemperatureIdeal = reading.temperature.avg >= valueBases.temperature.idealRange[0] && reading.temperature.avg <= valueBases.temperature.idealRange[1];
                                    const isHumidityComfortable = reading.humidity.avg >= valueBases.humidity.idealRange[0] && reading.humidity.avg <= valueBases.humidity.idealRange[1];
                                    const isLuminosityLow = reading.luminosity.avg < valueBases.luminosity.idealRange[1];
                                    const status = isLuminosityLow && isTemperatureIdeal && isHumidityComfortable ? 'ideal' :
                                        isLuminosityLow || isTemperatureIdeal || isHumidityComfortable ? 'alerta' :
                                            'critico';
                                    return (
                                        <div key={index} className="flex items-center justify-between p-4 rounded-lg border bg-slate-50">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-slate-500" />
                                                    <span className="font-medium">
                                                        {new Date(reading.timestamp * 1000).toLocaleString()}
                                                    </span>
                                                </div>
                                                <Badge variant="outline" className={getStatusColor(status)}>
                                                    {getStatusIcon(status)}
                                                    <span className="ml-1 capitalize">{status}</span>
                                                </Badge>
                                            </div>
                                            <div className="flex gap-6 text-sm">
                                                <div className="flex items-center gap-1">
                                                    <Thermometer className="w-4 h-4 text-orange-500" />
                                                    <span>{reading.temperature.avg.toFixed(2)}°C</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Droplet className="w-4 h-4 text-cyan-500" />
                                                    <span>{reading.humidity.avg.toFixed(2)}%</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Sun className="w-4 h-4 text-yellow-500" />
                                                    <span>{reading.luminosity.avg.toFixed(2)}lux</span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }
                                )}
                        </div>
                    </CardContent>
                </Card>

                {/* Environmental Status */}
                <Card className="border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle>Status Ambiental</CardTitle>
                        <CardDescription>
                            Condições atuais do ambiente
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Thermometer className="w-4 h-4 text-orange-500" />
                                    <span className="text-sm">Temperatura</span>
                                </div>
                                {getBadge(isLastTemperatureIdeal)}
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Droplet className="w-4 h-4 text-cyan-500" />
                                    <span className="text-sm">Umidade</span>
                                </div>
                                {getBadge(isLastHumidityComfortable)}
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sun className="w-4 h-4 text-yellow-500" />
                                    <span className="text-sm">Luminosidade</span>
                                </div>
                                {getBadge(isLastLuminosityLow)}
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <h4 className="font-medium mb-3">Recomendações</h4>
                            <div className="space-y-2 text-sm text-slate-600">
                                <p className="flex items-start gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    Ambiente ideal para sono profundo
                                </p>
                                <p className="flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                    Considere diminuir a luminosidade
                                </p>
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <h4 className="font-medium mb-3">Métricas</h4>
                            <div className="space-y-2 text-sm text-slate-600">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Thermometer className="w-4 h-4 text-orange-500" />
                                        <span className="text-sm">Maior Temperatura</span>
                                    </div>
                                    { overallMetrics.temperature.max }%
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Thermometer className="w-4 h-4 text-orange-500" />
                                        <span className="text-sm">Menor Temperatura</span>
                                    </div>
                                    { overallMetrics.temperature.min }%
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Sun className="w-4 h-4 text-orange-500" />
                                        <span className="text-sm">Maior Luminosidade</span>
                                    </div>
                                    { overallMetrics.luminosity.max } lux
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Sun className="w-4 h-4 text-orange-500" />
                                        <span className="text-sm">Menor Luminosidade</span>
                                    </div>
                                    { overallMetrics.luminosity.min } lux
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Droplet className="w-4 h-4 text-orange-500" />
                                        <span className="text-sm">Maior Humidade</span>
                                    </div>
                                    { overallMetrics.humidity.max }%
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Droplet className="w-4 h-4 text-orange-500" />
                                        <span className="text-sm">Menor Humidade</span>
                                    </div>
                                    { overallMetrics.humidity.min }%
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
    )
}