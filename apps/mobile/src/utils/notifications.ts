export interface PushRegistrationPayload {
  token: string;
  platform: "ios" | "android" | "web";
  userId?: string;
}

export class NotificationClient {
  private activeToken: string | null = null;

  async registerPushToken(payload: PushRegistrationPayload): Promise<boolean> {
    this.activeToken = payload.token;
    return true;
  }

  async unregisterPushToken(): Promise<boolean> {
    this.activeToken = null;
    return true;
  }

  getRegisteredToken(): string | null {
    return this.activeToken;
  }

  triggerLocalPositionNotification(position: number): { title: string; body: string } | null {
    if (position === 1) {
      return {
        title: "You're next in line!",
        body: "Please get ready. Your turn at the queue is coming up immediately.",
      };
    }
    return null;
  }
}

export const notificationClient = new NotificationClient();
