import React, { Component, ErrorInfo, ReactNode } from "react";
import { Text, View } from "react-native";

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };
  public static getDerivedStateFromError(_: Error): State { return { hasError: true }; }
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error(error, errorInfo); }
  public render() {
    if (this.state.hasError) return <View><Text>Error occured</Text></View>;
    return this.props.children;
  }
}
