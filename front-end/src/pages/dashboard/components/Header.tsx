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

export default function Header() {
    const { getDataMinutes, data, minutesInterval, handleChangeMinutesInterval } = useDashboard()
    const lastUpdate = data.length > 0 ? new Date(getDataMinutes(data[data.length - 1].timestamp * 1000)).toLocaleString() : "N/A";

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
            </div>
        </div>
    )
}