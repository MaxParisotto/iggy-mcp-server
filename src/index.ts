#!/usr/bin/env node

/**
 * This is a template MCP server that implements a simple task management system.
 * It demonstrates core MCP concepts like resources and tools by allowing:
 * - Listing tasks as resources
 * - Reading individual tasks
 * - Creating new tasks via a tool
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

/**
 * Type alias for a task object.
 */
type Task = { id: string; title: string; description: string };

/**
 * Simple in-memory storage for tasks.
 * In a real implementation, this would likely be backed by a database.
 */
const tasks: { [id: string]: Task } = {
  "1": { id: "1", title: "First Task", description: "This is task 1" },
  "2": { id: "2", title: "Second Task", description: "This is task 2" }
};

/**
 * Create an MCP server with capabilities for resources (to list/read tasks)
 * and tools (to create new tasks).
 */
const server = new Server(
  {
    name: "iggy-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

/**
 * Handler for listing available tasks as resources.
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: Object.values(tasks).map((task) => ({
      uri: `task:///${task.id}`,
      mimeType: "application/json",
      name: task.title,
      description: `Task: ${task.title}`
    }))
  };
});

/**
 * Handler for reading the contents of a specific task.
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const url = new URL(request.params.uri);
  const id = url.pathname.replace(/^\//, '');
  const task = tasks[id];

  if (!task) {
    throw new Error(`Task ${id} not found`);
  }

  return {
    contents: [{
      uri: request.params.uri,
      mimeType: "application/json",
      text: JSON.stringify(task, null, 2)
    }]
  };
});

/**
 * Handler that lists available tools.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_note",
        description: "Create a new note",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Title of the note"
            },
            content: {
              type: "string",
              description: "Text content of the note"
            }
          },
          required: ["title", "content"]
        }
      },
      {
        name: "memory_write",
        description: "Write memory chunks to Halcyon",
        inputSchema: {
          type: "object",
          properties: {
            source: {
              type: "string",
              description: "Source identifier"
            },
            task_id: {
              type: "string",
              description: "Task identifier"
            },
            payload: {
              type: "object",
              properties: {
                text: {
                  type: "string",
                  description: "Text content of the memory chunk"
                },
                tag: {
                  type: "string",
                  description: "Tag for the memory chunk"
                },
                timestamp: {
                  type: "string",
                  format: "date-time",
                  description: "Timestamp of the memory chunk"
                }
              },
              required: ["text", "tag", "timestamp"]
            }
          },
          required: ["source", "task_id", "payload"]
        }
      },
      {
        name: "list_tools",
        description: "List available tools",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "rag_query",
        description: "Query the RAG system",
        inputSchema: {
          type: "object",
          properties: {
            collection_name: {
              type: "string",
              description: "Name of the collection to query"
            },
            query: {
              type: "string",
              description: "Query text"
            },
            limit: {
              type: "integer",
              description: "Maximum number of results to return"
            },
            embedding_model: {
              type: "string",
              description: "Embedding model to use"
            },
            timeout: {
              type: "integer",
              description: "Timeout in seconds"
            }
          },
          required: ["collection_name", "query"]
        }
      },
      {
        name: "upload_documents",
        description: "Upload documents to the RAG system",
        inputSchema: {
          type: "object",
          properties: {
            collection_name: {
              type: "string",
              description: "Name of the collection to upload to"
            },
            texts: {
              type: "array",
              items: { type: "string" },
              description: "List of documents to upload"
            },
            metadata: {
              type: "array",
              items: { type: "object" },
              description: "Optional metadata for the documents"
            },
            source: {
              type: "string",
              description: "Optional source information for the documents"
            },
            embedding_model: {
              type: "string",
              description: "Embedding model to use"
            }
          },
          required: ["collection_name", "texts"]
        }
      }
    ]
  };
});

/**
 * Handler for the create_task tool.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "create_note": {
      const title = String(request.params.arguments?.title);
      const content = String(request.params.arguments?.content);
      if (!title || !content) {
        throw new Error("Title and content are required");
      }

      // Here you would typically save the note to a database
      // For this example, we'll just log it
      console.log(`Created note: ${title}`);

      return {
        content: [{
          type: "text",
          text: `Created note: ${title}`
        }]
      };
    }

    case "list_tools": {
      return {
        content: [{
          type: "text",
          text: JSON.stringify([
            "create_note",
            "memory_write",
            "list_tools",
            "rag_query",
            "upload_documents"
          ], null, 2)
        }]
      };
    }

    case "memory_write": {
      try {
        const source = String(request.params.arguments?.source);
        const task_id = String(request.params.arguments?.task_id);
        const payload = request.params.arguments?.payload as { text: string; tag: string; timestamp: string };

        if (!source || !task_id || !payload) {
          throw new Error("Source, task_id, and payload are required");
        }

        // Process the memory chunk
        console.log(`Received memory chunk from ${source} for task ${task_id}: ${payload.text}`);

        // Simulate processing the memory chunk
        // In a real implementation, you would save this to a database or perform some other action

        return {
          content: [{
            type: "text",
            text: `Processed memory chunk from ${source} for task ${task_id}`
          }]
        };
      } catch (error) {
        console.error("Error processing memory_write:", error);
        if (error instanceof Error) {
          throw new Error(`Failed to process memory_write: ${error.message}`);
        } else {
          throw new Error('Failed to process memory_write');
        }
      }
    }

    case "rag_query": {
      const collection_name = String(request.params.arguments?.collection_name);
      const query = String(request.params.arguments?.query);
      const limit = request.params.arguments?.limit ? Number(request.params.arguments.limit) : undefined;
      const embedding_model = String(request.params.arguments?.embedding_model);
      const timeout = request.params.arguments?.timeout ? Number(request.params.arguments.timeout) : undefined;

      // Call the RAG query API
      const response = await fetch(`http://localhost:8000/rag/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection_name, query, limit, embedding_model, timeout }),
      });

      if (!response.ok) {
        throw new Error(`RAG query failed: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    }

    case "upload_documents": {
      const collection_name = String(request.params.arguments?.collection_name);
      const texts = request.params.arguments?.texts as string[];
      const metadata = request.params.arguments?.metadata as object[] | undefined;
      const source = String(request.params.arguments?.source);
      const embedding_model = String(request.params.arguments?.embedding_model);

      // Call the document upload API
      const response = await fetch(`http://localhost:8000/rag/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection_name, texts, metadata, source, embedding_model }),
      });

      if (!response.ok) {
        throw new Error(`Document upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    }

    default:
      throw new Error("Unknown tool");
  }
});

/**
 * Start the server using stdio transport.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
