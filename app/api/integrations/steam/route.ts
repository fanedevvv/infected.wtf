import { integrationStatus, disconnectIntegration, toggleIntegrationVisibility } from "@/lib/integration-helpers";

export async function GET() {
  return integrationStatus("steam");
}
export async function DELETE() {
  return disconnectIntegration("steam");
}
export async function PATCH() {
  return toggleIntegrationVisibility("steam");
}
