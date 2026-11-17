// Centro de notificaciones (GET /notifications).

export interface AppNotification {
  readonly id: string;
  readonly apiId: number;
  readonly title: string;
  readonly text: string;
  readonly time: string;
  readonly read: boolean;
}
