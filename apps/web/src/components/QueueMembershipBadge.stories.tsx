import type { Meta, StoryObj } from "@storybook/react";
import { QueueMembershipBadge } from "./QueueMembershipBadge";

const meta: Meta<typeof QueueMembershipBadge> = { title: "Queue/QueueMembershipBadge", component: QueueMembershipBadge };
export default meta;
type Story = StoryObj<typeof QueueMembershipBadge>;
// Minimal story: render with default props; component may require runtime props in app.
export const Default: Story = { args: {} as any };
