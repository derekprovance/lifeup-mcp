import { expect } from 'vitest';
import { MCPToolResponse } from './mcp-client';

/**
 * Custom Assertions for MCP Responses
 *
 * Provides helper functions to validate MCP tool responses in e2e tests.
 * MCP responses are markdown strings, so these helpers make it easier
 * to write readable assertions.
 */

/**
 * Assert that an MCP response indicates success
 *
 * @param response The MCP tool response to validate
 * @throws AssertionError if response indicates error
 */
export function expectSuccess(response: MCPToolResponse): void {
  expect(response.isError).toBeFalsy();
  expect(response.text).toBeTruthy();
  expect(response.text.length).toBeGreaterThan(0);
}

/**
 * Assert that an MCP response indicates an error
 *
 * @param response The MCP tool response to validate
 * @throws AssertionError if response doesn't indicate error
 */
export function expectError(response: MCPToolResponse): void {
  expect(response.isError).toBeTruthy();
  expect(response.text).toMatch(/error|failed|invalid|blocked|cannot|refused|not found/i);
}

/**
 * Assert that a markdown response contains a table with minimum rows
 *
 * Useful for validating list responses that return markdown tables.
 *
 * @param text The markdown text to validate
 * @param minRows Minimum number of data rows (not counting header/separator)
 * @throws AssertionError if table doesn't meet requirements
 */
export function expectMarkdownTable(text: string, minRows: number = 1): void {
  const lines = text.split('\n');
  const tableRows = lines.filter((line) => line.includes('|'));
  // Usually: header line + separator line + data rows
  expect(tableRows.length).toBeGreaterThanOrEqual(minRows + 2);
}

/**
 * Assert that markdown contains a specific field with expected value
 *
 * Useful for validating detailed responses with fields like "Name: value"
 *
 * @param text The markdown text to validate
 * @param field The field name to look for (case-insensitive)
 * @param value The value to match (case-insensitive)
 * @throws AssertionError if field/value not found
 */
export function expectMarkdownField(text: string, field: string, value: string): void {
  const fieldRegex = new RegExp(`${field}.*${value}`, 'i');
  expect(text).toMatch(fieldRegex);
}

/**
 * Extract a numeric ID from an MCP response
 *
 * @param text The response text containing an ID
 * @param pattern Optional regex pattern to match. Default matches "ID: 123" or similar.
 * @returns The extracted numeric ID
 * @throws Error if ID cannot be extracted
 */
export function extractId(text: string, pattern?: RegExp): number {
  // Try the provided pattern first
  if (pattern) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }

  // Try markdown bold pattern: **ID**: 123 or **Achievement ID**: 123, **Item ID**: 123
  let match = text.match(/\*\*(?:Achievement |Item )?ID\*\*:\s*(\d+)/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }

  // Try plain pattern: ID: 123
  match = text.match(/ID[:\s]+(\d+)/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }

  throw new Error(`Could not extract ID from: ${text}`);
}

/**
 * Assert that markdown contains a specific keyword or phrase
 *
 * @param text The markdown text to validate
 * @param keyword The keyword to search for (case-insensitive)
 * @throws AssertionError if keyword not found
 */
export function expectKeyword(text: string, keyword: string): void {
  const regex = new RegExp(keyword, 'i');
  expect(text).toMatch(regex);
}

/**
 * Assert that a response contains successful creation indicators
 *
 * Looks for patterns like "Created", "Success", "Task ID", etc.
 *
 * @param response The MCP tool response
 * @throws AssertionError if creation success indicators not found
 */
export function expectCreatedSuccessfully(response: MCPToolResponse): void {
  expectSuccess(response);
  expect(response.text).toMatch(/created|success|ID/i);
}

/**
 * Assert that a response contains successful deletion indicators
 *
 * Looks for patterns like "Deleted", "Removed", "Success", etc.
 *
 * @param response The MCP tool response
 * @throws AssertionError if deletion success indicators not found
 */
export function expectDeletedSuccessfully(response: MCPToolResponse): void {
  expectSuccess(response);
  expect(response.text).toMatch(/deleted|removed|success/i);
}

/**
 * Assert that response contains a SAFE_MODE error message
 *
 * @param response The MCP tool response
 * @throws AssertionError if SAFE_MODE error not found
 */
export function expectSafeModeBlocked(response: MCPToolResponse): void {
  expectError(response);
  expect(response.text).toMatch(/safe.?mode|blocked|disabled|not available|cannot|prohibited/i);
}

/**
 * Assert that markdown contains specific content sections
 *
 * @param text The markdown text
 * @param sections Array of expected section headers (e.g., ["Task Details", "Rewards"])
 * @throws AssertionError if any section not found
 */
export function expectMarkdownSections(text: string, sections: string[]): void {
  sections.forEach((section) => {
    const sectionRegex = new RegExp(`##\\s+${section}|\\*\\*${section}\\*\\*|### ${section}`, 'i');
    expect(text).toMatch(sectionRegex);
  });
}

/**
 * Parse and count items in a markdown list
 *
 * @param text Markdown text containing a list
 * @returns Count of list items (lines starting with -, *, or numbers)
 */
export function countMarkdownListItems(text: string): number {
  const lines = text.split('\n');
  return lines.filter((line) => /^[\s]*[-*]|^[\s]*\d+\./.test(line)).length;
}

/**
 * Assert that markdown response has at least N items in a list
 *
 * @param text Markdown text
 * @param minItems Minimum expected list items
 * @throws AssertionError if list has fewer items
 */
export function expectMinimumListItems(text: string, minItems: number): void {
  const count = countMarkdownListItems(text);
  expect(count).toBeGreaterThanOrEqual(minItems);
}

/**
 * Extract all numeric values from markdown response
 *
 * Useful for validating numeric fields in responses
 *
 * @param text Markdown text
 * @returns Array of all numbers found
 */
export function extractNumbers(text: string): number[] {
  const matches = text.match(/\b\d+\b/g) || [];
  return matches.map((m) => parseInt(m, 10));
}
