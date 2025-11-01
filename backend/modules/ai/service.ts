/**
 * AI Service for Workflow Generation and Editing
 * Supports multiple LLM providers
 */

import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"
import type { INode } from "../../../nodes/__base__"
import {
  SYSTEM_PROMPT,
  editWorkflowPrompt,
  explainWorkflowPrompt,
  generateNodeLibraryContext,
  generateWorkflowPrompt,
  suggestImprovementsPrompt
} from "./prompts"

export type AIProvider = "openai" | "anthropic" | "cloudflare-ai"

export interface AIServiceConfig {
  provider: AIProvider
  apiKey?: string
  model?: string
}

export interface WorkflowGenerationRequest {
  description: string
  provider?: AIProvider
}

export interface WorkflowEditRequest {
  workflow: { nodes: any[]; edges: any[] }
  instruction: string
  provider?: AIProvider
}

export interface WorkflowExplanationRequest {
  workflow: { nodes: any[]; edges: any[] }
  provider?: AIProvider
}

export interface WorkflowSuggestionsRequest {
  workflow: { nodes: any[]; edges: any[] }
  provider?: AIProvider
}

export interface AIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
}

export class AIService {
  private openai?: OpenAI
  private anthropic?: Anthropic
  private defaultProvider: AIProvider
  private nodeLibraryContext: string

  constructor(
    config: AIServiceConfig,
    availableNodes: INode[]
  ) {
    this.defaultProvider = config.provider

    // Initialize providers
    if (config.provider === "openai") {
      this.openai = new OpenAI({
        apiKey: config.apiKey || process.env.OPENAI_API_KEY
      })
    } else if (config.provider === "anthropic") {
      this.anthropic = new Anthropic({
        apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY
      })
    }

    // Generate node library context once
    this.nodeLibraryContext = generateNodeLibraryContext(availableNodes)
  }

  /**
   * Generate a new workflow from natural language description
   */
  async generateWorkflow(
    request: WorkflowGenerationRequest
  ): Promise<AIResponse<{ nodes: any[]; edges: any[] }>> {
    try {
      const provider = request.provider || this.defaultProvider
      const prompt = generateWorkflowPrompt(
        request.description,
        this.nodeLibraryContext
      )

      let response: string
      let usage: any

      if (provider === "openai" && this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: "gpt-4-turbo-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          response_format: { type: "json_object" }
        })

        response = completion.choices[0]?.message?.content || "{}"
        usage = {
          inputTokens: completion.usage?.prompt_tokens || 0,
          outputTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0
        }
      } else if (provider === "anthropic" && this.anthropic) {
        const completion = await this.anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [
            { role: "user", content: prompt }
          ]
        })

        response = completion.content[0]?.type === "text" 
          ? completion.content[0].text 
          : "{}"
        
        usage = {
          inputTokens: completion.usage.input_tokens,
          outputTokens: completion.usage.output_tokens,
          totalTokens: completion.usage.input_tokens + completion.usage.output_tokens
        }
      } else {
        throw new Error(`Provider ${provider} not configured`)
      }

      // Parse and validate JSON response
      const workflow = this.parseWorkflowJSON(response)

      return {
        success: true,
        data: workflow,
        usage
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
  }

  /**
   * Edit an existing workflow with natural language instruction
   */
  async editWorkflow(
    request: WorkflowEditRequest
  ): Promise<AIResponse<{ nodes: any[]; edges: any[] }>> {
    try {
      const provider = request.provider || this.defaultProvider
      const prompt = editWorkflowPrompt(
        request.workflow,
        request.instruction,
        this.nodeLibraryContext
      )

      let response: string
      let usage: any

      if (provider === "openai" && this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: "gpt-4-turbo-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          response_format: { type: "json_object" }
        })

        response = completion.choices[0]?.message?.content || "{}"
        usage = {
          inputTokens: completion.usage?.prompt_tokens || 0,
          outputTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0
        }
      } else if (provider === "anthropic" && this.anthropic) {
        const completion = await this.anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [
            { role: "user", content: prompt }
          ]
        })

        response = completion.content[0]?.type === "text" 
          ? completion.content[0].text 
          : "{}"
        
        usage = {
          inputTokens: completion.usage.input_tokens,
          outputTokens: completion.usage.output_tokens,
          totalTokens: completion.usage.input_tokens + completion.usage.output_tokens
        }
      } else {
        throw new Error(`Provider ${provider} not configured`)
      }

      const workflow = this.parseWorkflowJSON(response)

      return {
        success: true,
        data: workflow,
        usage
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
  }

  /**
   * Explain a workflow in natural language
   */
  async explainWorkflow(
    request: WorkflowExplanationRequest
  ): Promise<AIResponse<{ explanation: string }>> {
    try {
      const provider = request.provider || this.defaultProvider
      const prompt = explainWorkflowPrompt(request.workflow)

      let response: string
      let usage: any

      if (provider === "openai" && this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: "gpt-4-turbo-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt }
          ],
          temperature: 0.7
        })

        response = completion.choices[0]?.message?.content || ""
        usage = {
          inputTokens: completion.usage?.prompt_tokens || 0,
          outputTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0
        }
      } else if (provider === "anthropic" && this.anthropic) {
        const completion = await this.anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          messages: [
            { role: "user", content: prompt }
          ]
        })

        response = completion.content[0]?.type === "text" 
          ? completion.content[0].text 
          : ""
        
        usage = {
          inputTokens: completion.usage.input_tokens,
          outputTokens: completion.usage.output_tokens,
          totalTokens: completion.usage.input_tokens + completion.usage.output_tokens
        }
      } else {
        throw new Error(`Provider ${provider} not configured`)
      }

      return {
        success: true,
        data: { explanation: response.trim() },
        usage
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
  }

  /**
   * Suggest improvements for a workflow
   */
  async suggestImprovements(
    request: WorkflowSuggestionsRequest
  ): Promise<AIResponse<{ suggestions: string[] }>> {
    try {
      const provider = request.provider || this.defaultProvider
      const prompt = suggestImprovementsPrompt(
        request.workflow,
        this.nodeLibraryContext
      )

      let response: string
      let usage: any

      if (provider === "openai" && this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: "gpt-4-turbo-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt }
          ],
          temperature: 0.7
        })

        response = completion.choices[0]?.message?.content || ""
        usage = {
          inputTokens: completion.usage?.prompt_tokens || 0,
          outputTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0
        }
      } else if (provider === "anthropic" && this.anthropic) {
        const completion = await this.anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          messages: [
            { role: "user", content: prompt }
          ]
        })

        response = completion.content[0]?.type === "text" 
          ? completion.content[0].text 
          : ""
        
        usage = {
          inputTokens: completion.usage.input_tokens,
          outputTokens: completion.usage.output_tokens,
          totalTokens: completion.usage.input_tokens + completion.usage.output_tokens
        }
      } else {
        throw new Error(`Provider ${provider} not configured`)
      }

      // Parse suggestions (expect numbered list or bullet points)
      const suggestions = response
        .split("\n")
        .filter(line => line.trim().match(/^[\d\-\*•]/))
        .map(line => line.replace(/^[\d\-\*•.)\s]+/, "").trim())
        .filter(Boolean)

      return {
        success: true,
        data: { suggestions },
        usage
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
  }

  /**
   * Parse and validate workflow JSON from LLM response
   */
  private parseWorkflowJSON(response: string): { nodes: any[]; edges: any[] } {
    // Try to extract JSON from markdown code blocks
    let jsonStr = response.trim()
    
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1]
    }

    // Parse JSON
    const workflow = JSON.parse(jsonStr)

    // Validate structure
    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      throw new Error("Invalid workflow: missing or invalid 'nodes' array")
    }

    if (!workflow.edges || !Array.isArray(workflow.edges)) {
      throw new Error("Invalid workflow: missing or invalid 'edges' array")
    }

    // Validate nodes have required fields
    for (const node of workflow.nodes) {
      if (!node.id || !node.type) {
        throw new Error(`Invalid node: missing id or type - ${JSON.stringify(node)}`)
      }
    }

    // Validate edges have required fields
    for (const edge of workflow.edges) {
      if (!edge.source || !edge.target) {
        throw new Error(`Invalid edge: missing source or target - ${JSON.stringify(edge)}`)
      }
    }

    return workflow
  }
}
