import type { Meta, StoryObj } from "@storybook/react";
import { Toast } from "./Toast";
const meta: Meta<typeof Toast> = { title: "Core/Toast", component: Toast };
export default meta;
type Story = StoryObj<typeof Toast>;
export const Success: Story = { args: { message: "Saved successfully", type: "success" } };
export const ErrorState: Story = { args: { message: "Something went wrong", type: "error" } };
