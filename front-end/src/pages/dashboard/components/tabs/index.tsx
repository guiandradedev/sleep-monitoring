import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TabsGeneral from "./general"
import TabsGraphics from "./graphics"

export default function TabsComponent() {
    return (
        < Tabs defaultValue="overview" className="space-y-6" >
            <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="analytics">Análises</TabsTrigger>
                {/* <TabsTrigger value="settings">Configurações</TabsTrigger> */}
            </TabsList>

            <TabsGeneral />
            <TabsGraphics />
        </Tabs >
    )
}