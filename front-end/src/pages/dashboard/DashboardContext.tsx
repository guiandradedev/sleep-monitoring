import type { ChartConfig } from '@/components/ui/chart';
import { axios } from '@/lib/axios';
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface DashboardContextProps {
    getDataMinutes: (timestamp: number) => number;
    data: ChartData[];
    minutesInterval: string;
    handleChangeMinutesInterval: (interval: string) => void;
    overallMetrics: OverallMetrics;
    nightId: string;
    handleChangeNightId: (range: string) => void;
}
const DashboardContext = createContext<DashboardContextProps | undefined>(undefined);

export type MetricData = {
    avg: number,
    min: number,
    max: number
}

export type ChartData = {
    timestamp: number,
    datetime: string,
    temperature: MetricData,
    humidity: MetricData,
    luminosity: MetricData
}

export type ChartTypes = "temperature" | "luminosity" | "humidity"
export type ChartUnits = "avg" | "min" | "max"

type OverallMetrics = {
    temperature: MetricData;
    humidity: MetricData;
    luminosity: MetricData;
}

export const valueBases = {
    temperature: {
        idealRange: [18, 22],
        unit: "°C"
    },
    humidity: {
        idealRange: [40, 60],
        unit: "%"
    },
    luminosity: {
        idealRange: [0, 20],
        unit: "lux"
    }
}

export const chartConfig = {
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

export const multipleSelectChartOptions = Object.entries(chartConfig).map((key) => {
    return {
        value: key[0],
        label: key[1].label
    };
})

export const DashboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [data, setData] = useState<ChartData[]>([]);
    const [minutesInterval, setMinutesInterval] = useState("10m");
    const [nightId, setNightId] = useState("");
    const [overallMetrics, setOverallMetrics] = useState<OverallMetrics>({
        temperature: { max: 0, min: 0, avg: 0},
        humidity: { max: 0, min: 0, avg: 0},
        luminosity: { max: 0, min: 0, avg: 0}
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                interface ResponseData {
                    data: ChartData[];
                    overall: OverallMetrics,
                    last_night: string;
                }
                const response = await axios.get<ResponseData>(`/dashboard?interval=${minutesInterval}&nightId=${nightId}`);
                if (!response.data || !Array.isArray(response.data.data)) {
                    throw new Error('Invalid data format received from the server');
                }
                const result = response.data.data.map(item => ({
                    ...item,
                    timestamp: new Date(item.timestamp).getTime(),
                    datetime: new Date(item.datetime).toISOString()
                }));
                if (result.length === 0) {
                    console.warn('No data received from the server');
                }
                console.log('Fetched dashboard data:', result);
                result.sort((a, b) => a.timestamp - b.timestamp);
                if (result.length > 0) {
                    const firstTimestamp = result[0].timestamp;
                    const lastTimestamp = result[result.length - 1].timestamp;
                    console.log(`Data range: ${new Date(firstTimestamp * 1000).toISOString()} to ${new Date(lastTimestamp * 1000).toISOString()}`);
                }
                setData(result);
                console.log(result)
                setOverallMetrics(response.data.overall);
            } catch (error) {
                // console.error('Failed to fetch dashboard data:', error);
            }
        };

        fetchData();
    }, [minutesInterval, nightId])

    function getDataMinutes(timestamp: number): number {
        const minutes = parseInt(minutesInterval);

        const addedTimestamp = timestamp + minutes * 60;

        return addedTimestamp;
    }

    function handleChangeMinutesInterval(interval: string) {
        setMinutesInterval(interval);
    }
    function handleChangeNightId(interval: string) {
        setNightId(interval);
    }
    return (
        <DashboardContext.Provider
            value={{
                getDataMinutes,
                data,
                minutesInterval,
                handleChangeMinutesInterval,
                overallMetrics,
                nightId,
                handleChangeNightId
            }}>
            {children}
        </DashboardContext.Provider>
    );
};

export const useDashboard = () => {
    const context = useContext(DashboardContext);
    if (context === undefined) {
        throw new Error('useDashboard must be used within an DashboardProvider');
    }
    return context;
};