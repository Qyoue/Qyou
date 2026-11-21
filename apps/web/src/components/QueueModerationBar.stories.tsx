import type { Meta, StoryObj } from "@storybook/react";
import { QueueModerationBar } from "./QueueModerationBar";

const meta: Meta<typeof QueueModerationBar> = { title: "Queue/QueueModerationBar", component: QueueModerationBar };
export default meta;
type Story = StoryObj<typeof QueueModerationBar>;
// Minimal story: render with default props; component may require runtime props in app.
export const Default: Story = { args: {} as any };
