import type { Meta, StoryObj } from "@storybook/react";
import { QueueFilterBar } from "./QueueFilterBar";

const meta: Meta<typeof QueueFilterBar> = { title: "Queue/QueueFilterBar", component: QueueFilterBar };
export default meta;
type Story = StoryObj<typeof QueueFilterBar>;
// Minimal story: render with default props; component may require runtime props in app.
export const Default: Story = { args: {} as any };
