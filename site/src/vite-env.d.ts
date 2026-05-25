/// <reference types="vite/client" />

declare module 'mermaid' {
  export interface MermaidConfig {
    startOnLoad?: boolean
    theme?: string
    themeVariables?: Record<string, string>
    flowchart?: Record<string, unknown>
    sequence?: Record<string, unknown>
  }

  export function initialize(config: MermaidConfig): void
  export function render(id: string, definition: string): Promise<{ svg: string }>
  export default { initialize, render }
}
