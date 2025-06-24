import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

export default function Dashboard() {
  // Dados mockados - substitua pela sua API
  const sleepData = {
    lastNight: {
      duration: "7h 23m",
      quality: 85,
      temperature: 22.5,
      humidity: 65,
      luminosity: 12
    },
    weekAverage: {
      duration: "7h 45m",
      quality: 82,
      temperature: 21.8,
      humidity: 62,
      luminosity: 15
    }
  }

  const recentReadings = [
    { time: "23:45", temp: 22.1, humidity: 67, light: 8, status: "optimal" },
    { time: "01:30", temp: 21.8, humidity: 65, light: 5, status: "optimal" },
    { time: "03:15", temp: 22.3, humidity: 68, light: 12, status: "warning" },
    { time: "05:00", temp: 21.9, humidity: 64, light: 18, status: "optimal" },
  ]

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'optimal': return 'bg-green-100 text-green-800 border-green-200'
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'optimal': return <CheckCircle className="w-4 h-4" />
      case 'warning': return <AlertCircle className="w-4 h-4" />
      case 'critical': return <AlertCircle className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              Sleep Monitor
            </h1>
            <p className="text-slate-600 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Última atualização: há 5 minutos
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              Relatório
            </Button>
            <Button size="sm">
              <Activity className="w-4 h-4 mr-2" />
              Monitorar Agora
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Sleep Duration */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">
                Duração do Sono
              </CardTitle>
              <Moon className="w-5 h-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">
                {sleepData.lastNight.duration}
              </div>
              <p className="text-xs text-blue-600 mt-1">
                <TrendingUp className="w-3 h-3 inline mr-1" />
                +12min vs média semanal
              </p>
            </CardContent>
          </Card>

          {/* Sleep Quality */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">
                Qualidade do Sono
              </CardTitle>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900">
                {sleepData.lastNight.quality}%
              </div>
              <Progress value={sleepData.lastNight.quality} className="mt-2" />
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
                {sleepData.lastNight.temperature}°C
              </div>
              <p className="text-xs text-orange-600 mt-1">
                Ideal para o sono
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
                {sleepData.lastNight.humidity}%
              </div>
              <p className="text-xs text-cyan-600 mt-1">
                Nível confortável
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="analytics">Análises</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

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
                    {recentReadings.map((reading, index) => (
                      <div key={index} className="flex items-center justify-between p-4 rounded-lg border bg-slate-50">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-500" />
                            <span className="font-medium">{reading.time}</span>
                          </div>
                          <Badge variant="outline" className={getStatusColor(reading.status)}>
                            {getStatusIcon(reading.status)}
                            <span className="ml-1 capitalize">{reading.status}</span>
                          </Badge>
                        </div>
                        <div className="flex gap-6 text-sm">
                          <div className="flex items-center gap-1">
                            <Thermometer className="w-4 h-4 text-orange-500" />
                            <span>{reading.temp}°C</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Droplet className="w-4 h-4 text-cyan-500" />
                            <span>{reading.humidity}%</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Sun className="w-4 h-4 text-yellow-500" />
                            <span>{reading.light}lx</span>
                          </div>
                        </div>
                      </div>
                    ))}
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
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        Ideal
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Droplet className="w-4 h-4 text-cyan-500" />
                        <span className="text-sm">Umidade</span>
                      </div>
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        Ótima
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sun className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm">Luminosidade</span>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                        Moderada
                      </Badge>
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
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Análises Detalhadas</CardTitle>
                <CardDescription>
                  Gráficos e tendências dos seus dados de sono
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Gráficos e análises em desenvolvimento</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Configurações</CardTitle>
                <CardDescription>
                  Personalize suas preferências de monitoramento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Painel de configurações em desenvolvimento</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}