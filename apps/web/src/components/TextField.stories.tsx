import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { TextField } from "./TextField";

const meta: Meta<typeof TextField> = { title: "Core/TextField", component: TextField };
export default meta;
type Story = StoryObj<typeof TextField>;
export const Default: Story = { render: () => { const [v,setV]=useState(""); return <TextField label="Email" name="email" value={v} onChange={setV} />; } };
export const Error: Story = { render: () => { const [v,setV]=useState(""); return <TextField label="Email" name="email" value={v} onChange={setV} error="Email is required" />; } };
