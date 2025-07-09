import { DashboardProvider } from "./DashboardContext";
import DashboardPage from "./DashboardPage";

export default function Dashboard() {
  return (
    <DashboardProvider>
        <DashboardPage />
    </DashboardProvider>
  )
}