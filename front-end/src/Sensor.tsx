"use client"

import { useState, useEffect, useMemo } from "react"
import { Area, Line, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts" // Adicionando Line, YAxis
import axios from 'axios'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MultiSelect } from "./components/ui/multi-select"

export const description = "An interactive area chart with environmental data"

// Tipos de dados aninhados para avg, min, max
type MetricData = {
  avg: number,
  min: number,
  max: number
}

// Interface para os dados do gráfico, alinhada com a resposta do backend
type ChartData = {
  timestamp: number, // Unix timestamp em segundos para o domínio numérico
  datetime: string, // String de data/hora formatada para exibição
  temperature: MetricData,
  humidity: MetricData,
  luminosity: MetricData
}

type ChartTypes = "temperature" | "luminosity" | "humidity"
type ChartUnits = "avg" | "min" | "max"

// 1. ChartConfig para todas as linhas (avg, min, max) e suas cores
const chartConfig = {
  // Temperatura (base: vermelho-alaranjado)
  "temperature.avg": { label: "Temperatura (Média)", color: "#FF6347" },     // Tomato
  "temperature.min": { label: "Temperatura (Min)", color: "#FFA07A" },     // Light Salmon (um vermelho mais claro/suave)
  "temperature.max": { label: "Temperatura (Max)", color: "#CD5C5C" },     // Indian Red (um vermelho mais escuro/intenso)

  // Umidade (base: azul aço)
  "humidity.avg": { label: "Umidade (Média)", color: "#4682B4" },     // Steel Blue
  "humidity.min": { label: "Umidade (Min)", color: "#87CEFA" },     // Light Sky Blue (um azul mais claro)
  "humidity.max": { label: "Umidade (Max)", color: "#191970" },     // Midnight Blue (um azul bem escuro)

  // Luminosidade (base: dourado)
  "luminosity.avg": { label: "Luminosidade (Média)", color: "#FFD700" },     // Gold
  "luminosity.min": { label: "Luminosidade (Min)", color: "#FFFACD" },     // Lemon Chiffon (um amarelo bem clarinho)
  "luminosity.max": { label: "Luminosidade (Max)", color: "#DAA520" },     // Goldenrod (um dourado mais escuro)
} satisfies ChartConfig;

const selectOptions = Object.entries(chartConfig).map((key) => {
  return {
    value: key[0],
    label: key[1].label
  };
})

export default function ChartAreaInteractive() {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [timeRange, setTimeRange] = useState("90d");
  const [minutesInterval, setMinutesInterval] = useState("10m"); // Estado para o intervalo de minutos
  const [selectedChartTypes, setSelectedChartTypes] = useState<string[]>(['temperature.avg', 'luminosity.avg', 'humidity.avg']);

  // Efeito para buscar os dados da API
  useEffect(() => {
    async function getData() {
      setLoading(true);
      setError(null);
      try {
        // Agora, passa o minutesInterval para a URL da API
        const response = await axios.get(`http://127.0.0.1:5001/data?interval=${minutesInterval}`); // Porta 5000 como no Flask

        // A API já retorna no formato desejado, então podemos setar diretamente
        setData(response.data as ChartData[]);
      } catch (err: any) {
        console.error("Erro ao buscar dados:", err);
        setError("Não foi possível carregar os dados. Verifique a API.");
      } finally {
        setLoading(false);
      }
    }
    getData();
  }, [minutesInterval]); // Dependência em minutesInterval para refetch quando ele mudar

  // Lógica de filtragem dos dados baseada no timeRange
  const filteredData = useMemo(() => {
    // if (!data || data.length === 0) return [];

    // // Encontrar o timestamp mais recente nos dados para usar como referência
    // const latestTimestamp = data.length > 0 ? Math.max(...data.map(d => d.timestamp)) : null;

    // if (!latestTimestamp) return [];

    // let referenceDate = new Date(latestTimestamp * 1000); // Converte para Date object (em ms)
    // let startDate = new Date(referenceDate);

    // let daysToSubtract = 0;
    // if (timeRange === "90d") {
    //   daysToSubtract = 90;
    // } else if (timeRange === "30d") {
    //   daysToSubtract = 30;
    // } else if (timeRange === "7d") {
    //   daysToSubtract = 7;
    // }

    // startDate.setDate(referenceDate.getDate() - daysToSubtract);
    // const startTimestamp = startDate.getTime() / 1000; // Converte de volta para segundos para comparação

    // return data.filter((item) => item.timestamp >= startTimestamp);
    return data;
  }, [data, timeRange]);

  if (loading) {
    return (
      <Card className="pt-0">
        <CardHeader className="flex items-center justify-center h-[250px]">
          <CardTitle>Carregando dados...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="pt-0">
        <CardHeader className="flex items-center justify-center h-[250px]">
          <CardTitle className="text-red-500">Erro:</CardTitle>
          <CardDescription className="text-red-500">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!filteredData || filteredData.length === 0) {
    return (
      <Card className="pt-0">
        <CardHeader className="flex items-center justify-center h-[250px]">
          <CardTitle>Nenhum dado disponível para o período ou intervalo selecionado.</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Dados do ambiente</CardTitle>
          <CardDescription>
            Mostrando a qualidade do ambiente em intervalos de {minutesInterval}
          </CardDescription>
        </div>
        <MultiSelect
          options={selectOptions}
          onValueChange={setSelectedChartTypes}
          defaultValue={selectedChartTypes}
          placeholder="Selecione tipos de dados"
          variant="secondary"
          animation={2}
          maxCount={3}
          className="w-[700px]"
        />
        {/* Select para o intervalo de minutos */}
        <Select value={minutesInterval} onValueChange={setMinutesInterval}>
          <SelectTrigger
            className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
            aria-label="Select interval"
          >
            <SelectValue placeholder="Intervalo" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {/* <SelectItem value="1m" className="rounded-lg">1 minuto</SelectItem> */}
            <SelectItem value="2m" className="rounded-lg">2 minutos</SelectItem>
            <SelectItem value="5m" className="rounded-lg">5 minutos</SelectItem>
            <SelectItem value="10m" className="rounded-lg">10 minutos</SelectItem>
            <SelectItem value="30m" className="rounded-lg">30 minutos</SelectItem>
            <SelectItem value="45m" className="rounded-lg">45 minutos</SelectItem>
            <SelectItem value="60m" className="rounded-lg">60 minutos</SelectItem>
          </SelectContent>
        </Select>

        {/* Select para o range de tempo (dias) */}
        {/* <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
            aria-label="Select time range"
          >
            <SelectValue placeholder="Últimos 3 meses" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">Últimos 3 meses</SelectItem>
            <SelectItem value="30d" className="rounded-lg">Últimos 30 dias</SelectItem>
            <SelectItem value="7d" className="rounded-lg">Últimos 7 dias</SelectItem>
          </SelectContent>
        </Select> */}
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              {/* Gradientes para as áreas de média (existente) */}
              <linearGradient id="fillTemperatureAvg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartConfig["temperature.avg"].color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={chartConfig["temperature.avg"].color} stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillHumidityAvg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartConfig["humidity.avg"].color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={chartConfig["humidity.avg"].color} stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillLuminosityAvg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartConfig["luminosity.avg"].color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={chartConfig["luminosity.avg"].color} stopOpacity={0.1} />
              </linearGradient>

              {/* NOVAS: Gradientes para Temperature Min e Max */}
              <linearGradient id="fillTemperatureMin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartConfig["temperature.min"].color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={chartConfig["temperature.min"].color} stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillTemperatureMax" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartConfig["temperature.max"].color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={chartConfig["temperature.max"].color} stopOpacity={0.1} />
              </linearGradient>

              {/* NOVAS: Gradientes para Humidity Min e Max */}
              <linearGradient id="fillHumidityMin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartConfig["humidity.min"].color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={chartConfig["humidity.min"].color} stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillHumidityMax" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartConfig["humidity.max"].color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={chartConfig["humidity.max"].color} stopOpacity={0.1} />
              </linearGradient>

              {/* NOVAS: Gradientes para Luminosity Min e Max */}
              <linearGradient id="fillLuminosityMin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartConfig["luminosity.min"].color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={chartConfig["luminosity.min"].color} stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillLuminosityMax" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartConfig["luminosity.max"].color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={chartConfig["luminosity.max"].color} stopOpacity={0.1} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="datetime" // Usa a string formatada para exibir no eixo X
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value: string) => {
                // 'value' já é a string formatada do backend
                const date = new Date(value);
                // Exibe apenas dia/mês para evitar sobreposição, ou ajuste conforme a densidade
                return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
              }}
            />
            {/* Eixo Y esquerdo para Temperatura e Umidade */}
            <YAxis
              yAxisId="left"
              stroke={chartConfig['temperature.avg'].color} // Cor do traço do eixo
              tickLine={false}
              axisLine={false}
              label={{
                value: "Temp (°C) / Umidade (%)",
                angle: -90,
                // position: 'insideLeft',
                fill: 'hsl(var(--foreground))'
              }}
            />
            {/* Eixo Y direito para Luminosidade */}
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke={chartConfig['luminosity.avg'].color} // Cor do traço do eixo
              tickLine={false}
              axisLine={false}
              label={{
                value: "Luminosidade",
                angle: 90,
                // position: 'insideRight',
                fill: 'hsl(var(--foreground))'
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    // 'value' é a string datetime
                    return new Date(value).toLocaleDateString("pt-BR", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  }}
                  formatter={(value: any, name: any, props: any) => { // Use string | number
                    const numericValue = typeof value === 'string' ? parseFloat(value) : value; // Ensure number
                    if (isNaN(numericValue)) return ''; // Handle cases where conversion fails

                    const metricName = name.split('.')[0] as ChartTypes;
                    const type = name.split('.')[1] as ChartUnits;

                    const formattedValue = numericValue.toFixed(2);
                    let unit = "";
                    if (metricName.includes("temperature")) unit = " °C";
                    else if (metricName.includes("humidity")) unit = " %";

                    let configKey = (`${metricName}.${type}`) as keyof typeof chartConfig

                    return [`${formattedValue}${unit} `, chartConfig[configKey]?.label || name];
                  }}
                  indicator="dot"
                />
              }
            />
            {/* Linhas para Temperatura (média, min, max) */}
            {
              selectedChartTypes.includes("temperature.avg") && (
                <Area
                  dataKey="temperature.avg"
                  type="natural"
                  fill="url(#fillTemperatureAvg)"
                  stroke={chartConfig['temperature.avg'].color}
                  yAxisId="left"
                />
              )
            }
            {
              selectedChartTypes.includes("temperature.min") && (
                <Area
                  dataKey="temperature.min"
                  type="natural"
                  stroke={chartConfig['temperature.min'].color}
                  fill="url(#fillTemperatureMin)"
                  yAxisId="left"
                  dot={false}
                />
              )
            }
            {
              selectedChartTypes.includes("temperature.max") && (
                <Area
                  dataKey="temperature.max"
                  type="natural"
                  stroke={chartConfig['temperature.max'].color}
                  fill="url(#fillTemperatureMax)"
                  yAxisId="left"
                  dot={false} // Remove os pontos na linha
                />
              )
            }
            {
              selectedChartTypes.includes("humidity.avg") && (
                <Area
                  dataKey="humidity.avg"
                  type="natural"
                  fill="url(#fillHumidityAvg)"
                  stroke={chartConfig['humidity.avg'].color}
                  yAxisId="left"
                />
              )
            }

            {
              selectedChartTypes.includes("humidity.min") && (
                <Area
                  dataKey="humidity.min"
                  type="natural"
                  stroke={chartConfig['humidity.min'].color}
                  //   strokeDasharray={chartConfig['humidity.avg']Min.strokeDasharray}
                  fill="url(#fillHumidityMin)"
                  yAxisId="left"
                  dot={false}
                />
              )
            }

            {
              selectedChartTypes.includes("humidity.max") && (
                <Area
                  dataKey="humidity.max"
                  type="natural"
                  stroke={chartConfig['humidity.max'].color}
                  fill="url(#fillHumidityMax)"
                  //   strokeDasharray={chartConfig['humidity.avg']Max.strokeDasharray}
                  yAxisId="left"
                  dot={false}
                />
              )
            }

            {/* Linhas para Luminosidade (média, min, max) */}
            {
              selectedChartTypes.includes("luminosity.avg") && (
                <Area
                  dataKey="luminosity.avg"
                  type="natural"
                  fill="url(#fillLuminosityAvg)"
                  stroke={chartConfig['luminosity.avg'].color}
                  yAxisId="right"
                />
              )
            }
            {
              selectedChartTypes.includes("luminosity.min") && (
                <Area
                  dataKey="luminosity.min"
                  type="natural"
                  stroke={chartConfig['luminosity.min'].color}
                  fill="url(#fillLuminosityMin)"
                  //   strokeDasharray={chartConfig.luminosityMin.strokeDasharray}
                  yAxisId="right"
                  dot={false}
                />
              )
            }
            {
              selectedChartTypes.includes("luminosity.max") && (
                <Area
                  dataKey="luminosity.max"
                  type="natural"
                  stroke={chartConfig['luminosity.max'].color}
                  fill="url(#fillLuminosityMax)"
                  //   strokeDasharray={chartConfig.luminosityMax.strokeDasharray}
                  yAxisId="right"
                  dot={false}
                />
              )
            }



            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}