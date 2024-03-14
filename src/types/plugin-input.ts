import { EmitterWebhookEvent as WebhookEvent, EmitterWebhookEventName as WebhookEventName } from "@octokit/webhooks";
import { SupportedEvents } from "./context";

export interface PluginInputs<T extends WebhookEventName = SupportedEvents> {
  stateId: string;
  eventName: T;
  eventPayload: WebhookEvent<T>["payload"];
  settings: DailySteakSettings;
  authToken: string;
  ref: string;
}

export interface DailySteakSettings {
  maxPermitPrice: number;
  basePriceMultiplier: number;
  issueCreatorMultiplier: number;
}
