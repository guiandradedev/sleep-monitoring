import { multipleSelectChartOptions, useDashboard, valueBases } from "../../DashboardContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TabsContent } from "@/components/ui/tabs"
import { MultiSelect } from "@/components/ui/multi-select"
import { useState } from "react"
import Chart from "./chart"

export default function TabsGraphics() {
    const [selectedChartTypes, setSelectedChartTypes] = useState<string[]>(['temperature.avg', 'luminosity.avg', 'humidity.avg']);

    return (
        <TabsContent value="analytics">
            <Card className="border-0 shadow-lg">
                <CardHeader className="flex space-y-2 justify-between w-full">
                    <div>
                        <CardTitle>Análises Detalhadas</CardTitle>
                        <CardDescription>
                            Gráficos e tendências dos seus dados de sono
                        </CardDescription>
                    </div>
                    <div>
                        <MultiSelect
                            options={multipleSelectChartOptions}
                            onValueChange={setSelectedChartTypes}
                            defaultValue={selectedChartTypes}
                            placeholder="Selecione tipos de dados"
                            variant="secondary"
                            maxCount={4}
                            className="w-[800px]"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Chart selectedChartTypes={selectedChartTypes}/>
                </CardContent>
            </Card>
        </TabsContent>
    )
}