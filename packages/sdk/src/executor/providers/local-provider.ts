import { BrowserSession, BrowserProfile } from 'browser-use';
import { ChatAnthropic } from 'browser-use/llm/anthropic';
import { ChatOpenAI } from 'browser-use/llm/openai';
import { ChatGoogle } from 'browser-use/llm/google';
import type { BaseChatModel } from 'browser-use/llm/base';
import type { BrowserProvider } from '../browser-provider.js';

/**
 * Default browser provider — runs Chromium locally via Playwright.
 * Auto-detects LLM provider from API key prefix or explicit model name.
 */
export class LocalBrowserProvider implements BrowserProvider {
  createSession(headless = true): BrowserSession {
    return new BrowserSession({
      browser_profile: new BrowserProfile({
        headless,
      }),
    });
  }

  createLLM(apiKey?: string, modelName?: string): BaseChatModel {
    if (!apiKey) {
      throw new Error('No LLM API key provided. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_API_KEY.');
    }

    // If explicit model name hints at provider, use that
    if (modelName) {
      if (modelName.includes('claude') || modelName.includes('anthropic')) {
        return new ChatAnthropic({ model: modelName, apiKey });
      }
      if (modelName.includes('gpt') || modelName.includes('o1') || modelName.includes('o3') || modelName.includes('o4')) {
        return new ChatOpenAI({ model: modelName, apiKey });
      }
      if (modelName.includes('gemini')) {
        return new ChatGoogle(modelName);
      }
    }

    // Auto-detect from key prefix
    if (apiKey.startsWith('sk-ant-')) {
      return new ChatAnthropic({ model: modelName ?? 'claude-sonnet-4-20250514', apiKey });
    }
    if (apiKey.startsWith('sk-')) {
      return new ChatOpenAI({ model: modelName ?? 'gpt-4o', apiKey });
    }

    // Default to Anthropic
    return new ChatAnthropic({ model: modelName ?? 'claude-sonnet-4-20250514', apiKey });
  }

  async close(): Promise<void> {
    // No cleanup needed for local mode
  }
}
