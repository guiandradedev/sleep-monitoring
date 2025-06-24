import { Button } from "@/components/ui/button"
import {
    Activity,
    Calendar,
} from "lucide-react"
import { useDashboard } from "../DashboardContext";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { useEffect, useState } from "react";
import { axios } from "@/lib/axios";

interface Nights {
    first_timestamp: number;
    last_timestamp: number;
    night_id: number;
}

export default function Header() {
    const { getDataMinutes, data, minutesInterval, handleChangeMinutesInterval, nightId, handleChangeNightId } = useDashboard()
    const lastUpdate = data.length > 0 ? new Date(getDataMinutes(data[data.length - 1].timestamp * 1000)).toLocaleString() : "N/A";
    const [nights, setNights] = useState<Nights[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(()=>{
        async function getNights() {
            setLoading(true);
            interface NightsResponse {
                data: Nights[];
            }
            const response = await axios.get<NightsResponse>('/nights')
            if (!response.data || !Array.isArray(response.data.data)) {
                throw new Error('Invalid data format received from the server');
            }
            setNights(response.data.data);
            handleChangeNightId(String(response.data.data[response.data.data.length - 1].night_id));
            setLoading(false)
        }
        getNights()
    }, [])
    useEffect(()=>{ console.log("Nights:", nightId) }, [nightId])

    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div>
                <h1 className="text-4xl font-bold text-slate-900 mb-2">
                    Monitoramento do ambiente do sono
                </h1>
                <p className="text-slate-600 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Última atualização: {lastUpdate}
                </p>
            </div>
            <div className="flex gap-3">
                {/* <Button variant="outline" size="sm">
                    <Calendar className="w-4 h-4 mr-2" />
                    Relatório
                </Button>
                <Button size="sm">
                    <Activity className="w-4 h-4 mr-2" />
                    Monitorar Agora
                </Button> */}
                <Select value={minutesInterval} onValueChange={handleChangeMinutesInterval}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <SelectTrigger
                                className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
                                aria-label="Select interval"
                            >
                                <SelectValue placeholder="Intervalo" />
                            </SelectTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Selecione o intervalo de atualização dos dados</p>
                        </TooltipContent>
                    </Tooltip>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="2m" className="rounded-lg">2 minutos</SelectItem>
                        <SelectItem value="5m" className="rounded-lg">5 minutos</SelectItem>
                        <SelectItem value="10m" className="rounded-lg">10 minutos</SelectItem>
                        <SelectItem value="30m" className="rounded-lg">30 minutos</SelectItem>
                        <SelectItem value="45m" className="rounded-lg">45 minutos</SelectItem>
                        <SelectItem value="60m" className="rounded-lg">60 minutos</SelectItem>
                    </SelectContent>
                </Select>
                
                {
                    loading && "Carregando noites..."
                }
                { nights.length > 0 && !loading && (
                    <Select value={nightId} onValueChange={handleChangeNightId}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <SelectTrigger
                                    className="hidden w-[250px] rounded-lg sm:ml-auto sm:flex"
                                    aria-label="Select interval"
                                >
                                    <SelectValue placeholder="Intervalo" />
                                </SelectTrigger>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Selecione o dia de analise</p>
                            </TooltipContent>
                        </Tooltip>
                        <SelectContent className="rounded-xl">
                            {
                                nights.map((night) => (
                                    <SelectItem
                                        key={night.night_id}
                                        value={String(night.night_id)}
                                        className="rounded-lg"
                                    >
                                        Noite {night.night_id}: {new Date(night.first_timestamp * 1000).toLocaleDateString()} - {new Date(night.last_timestamp * 1000).toLocaleDateString()}
                                    </SelectItem>
                                ))
                            }
                        </SelectContent>
                    </Select>
                )}
            </div>
        </div>
    )
}