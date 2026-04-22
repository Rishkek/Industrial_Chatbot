ARIA — Adaptive Retrieval Intelligence Assistant

AI-Powered Industrial Document Question-Answering System

Overview

ARIA (Adaptive Retrieval Intelligence Assistant) is an AI-powered document intelligence system designed to answer technical questions using uploaded PDF documents.

The system implements a Retrieval-Augmented Generation (RAG) workflow that combines semantic search with large language model reasoning. Technical documents are processed, indexed, and queried through a Flask-based backend. A browser-based interface is provided through a Chrome extension..

ARIA is designed to simulate an industrial-grade technical assistant capable of extracting, interpreting, and presenting structured responses from engineering and industrial documentation.

Core Functionalities
Document Upload and Processing

PDF documents are uploaded through the backend and stored locally in:

Source_Code/APP/saved_documents/

Processing is handled inside:

Source_Code/APP/app.py

Document ingestion includes:

Reading PDF content using PyMuPDF
Extracting multi-page text
Splitting text into overlapping segments
Generating semantic embeddings
Creating searchable vector indexes

Text chunking parameters are defined directly in:

Source_Code/APP/app.py

Key configuration variables:

CHUNK_SIZE
CHUNK_OVERLAP
TOP_K

These parameters determine chunk length, overlap behavior, and retrieval depth.

Semantic Retrieval Engine

The semantic search workflow converts both document chunks and user queries into embeddings.

Embedding generation uses:

sentence-transformers/all-MiniLM-L6-v2

Vector indexing and retrieval are handled using FAISS, implemented in:

Source_Code/APP/app.py

During query execution:

The user query is embedded
The FAISS index is searched
Top-K relevant chunks are retrieved
Retrieved content is injected into the prompt

This ensures responses remain grounded in document content.

Language Model Response Generation

Response generation is performed using the Hugging Face model:

stabilityai/stablelm-zephyr-3b

The model is initialized within:

Source_Code/APP/app.py

Prompt construction includes:

System-level ARIA persona instructions
Retrieved document context
Conversation history
User input

This structured prompt ensures consistent and context-aware outputs.

ARIA Persona System

ARIA operates using a structured system persona defined inside:

Source_Code/APP/app.py

The persona enforces:

Context-bound responses
Structured technical output
Clarification handling
Professional communication style
Follow-up support behavior

This mechanism improves reliability and prevents unsupported answers.

Conversational Memory Support

Conversation history is maintained during interactions.

Historical turns are:

Included in prompt construction
Limited to recent exchanges
Used to preserve context continuity

History handling logic exists in:

build_prompt() function  
Source_Code/APP/app.py

This allows multi-step conversations instead of isolated queries.

REST API Backend

The system backend is implemented using Flask, located in:

Source_Code/APP/app.py

Available endpoints include:

System Monitoring
GET /health

Returns:

System status
Active document name
Indexed chunk count
Document Management

Upload document:

POST /upload

Load stored document:

POST /load_document

Delete document:

POST /delete_document

Clear active document:

POST /clear_document

List stored documents:

GET /documents

These endpoints manage document lifecycle operations.

Chat Interaction

Primary interaction endpoint:

POST /chat

Input includes:

User message
Conversation history

Output includes:

Generated response
Number of retrieved sources
Active document reference

This endpoint forms the main conversational interface.

Browser-Based User Interface

User interaction is supported through a Chrome extension located in:

Source_Code/chrome_extension/

Key files:

content.js
content.css
manifest.json
icon.png

Responsibilities include:

Capturing user queries
Sending requests to Flask backend
Rendering chatbot responses
Styling the chat interface
Managing extension permissions

The extension enables direct interaction without requiring a standalone web UI.

System Behavior Summary

The complete workflow executed by the system:

PDF document is uploaded
Text is extracted from the file
Document is split into overlapping segments
Embeddings are generated
FAISS index is built
User submits a query
Relevant document segments are retrieved
Prompt is assembled
Language model generates response
Response is returned to the interface

This pipeline represents a full implementation of a retrieval-based question-answering system.

Technologies Used
Backend Framework
Python
Flask
Flask-CORS

Responsible for:

API routing
Document handling
Query execution
Language Model

Model:

stabilityai/stablelm-zephyr-3b

Used for:

Natural language generation
Response synthesis
Context reasoning
Embedding Model

Model:

sentence-transformers/all-MiniLM-L6-v2

Used for:

Semantic search
Vector encoding
Document similarity matching
Vector Database

Library:

FAISS

Used for:

High-speed similarity search
Vector indexing
Context retrieval
PDF Processing

Library:

PyMuPDF (fitz)

Used for:

Reading PDF files
Extracting structured text
Frontend Interface

Platform:

Chrome Extension

Files located in:

Source_Code/chrome_extension/

Used for:

User interaction
Query submission
Response display
Functional Capabilities

ARIA supports:

Technical document querying
Engineering manual interpretation
Safety guideline retrieval
Maintenance procedure lookup
Troubleshooting assistance
Context-aware conversational responses

Supported document types:

Equipment manuals
Safety documentation
Maintenance guides
Technical specifications
Industrial procedures
Design Characteristics

The system demonstrates:

Retrieval-Augmented Generation architecture
Dynamic document ingestion
Context-aware prompt generation
Semantic vector search
Persistent document storage
Modular API design
Browser-based chatbot interface

These characteristics reflect real-world industrial document intelligence workflows.

Potential Extensions

Future development may include:

Multi-document simultaneous retrieval
Persistent FAISS index storage
Web-based dashboard interface
Streaming response generation
Voice interaction capability
Model fine-tuning support
Document summarization modes
Project Scope

ARIA represents a working implementation of:

Document-based question answering
Prompt engineering techniques
Semantic search pipelines
Industrial knowledge retrieval systems
Retrieval-Augmented Generation (RAG)

The system architecture supports scalable expansion into enterprise-level technical knowledge systems.
