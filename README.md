# Industrial_Chatbot
ARIA — AI-Powered Industrial Document Chatbot
Overview

ARIA (Adaptive Retrieval Intelligence Assistant) is an AI-powered industrial document chatbot designed to answer technical questions using uploaded PDF documents.

The system implements a Retrieval-Augmented Generation (RAG) pipeline using Hugging Face language models, semantic embeddings, and FAISS vector search. Users can upload industrial or technical documents, ask questions, and receive structured responses derived from document content.

The project includes:

A Flask-based backend API
A document indexing and retrieval pipeline
A Chrome extension interface for user interaction
An industrial-grade response persona (ARIA)

This system demonstrates real-world document-based AI reasoning suitable for industrial and engineering environments.

Repository Structure

This repository follows the exact structure below:

ARIA/
│
├── Source_Code/
│   │
│   ├── APP/
│   │   │
│   │   ├── saved_documents/
│   │   │   (Stores uploaded PDF files)
│   │   │
│   │   ├── app.py
│   │   │   Main backend Flask application
│   │   │
│   │   ├── requirements.txt
│   │   │   Python dependencies
│   │
│   ├── chrome_extension/
│   │   │
│   │   ├── content.js
│   │   │   Handles chatbot UI logic
│   │   │
│   │   ├── content.css
│   │   │   Styles chatbot interface
│   │   │
│   │   ├── manifest.json
│   │   │   Chrome extension configuration
│   │   │
│   │   ├── icon.png
│   │       Extension icon
│
└── README.md
System Architecture

ARIA uses a Retrieval-Augmented Generation (RAG) architecture.

Pipeline Flow
User uploads a PDF
PDF text is extracted
Text is chunked into segments
Embeddings are generated
FAISS index is created
User submits a query
Relevant chunks are retrieved
Prompt is constructed
Language model generates response
Answer is returned to user
Core Features
1. PDF Document Upload and Indexing

Users can upload technical or industrial PDF documents.

The system:

Extracts text using PyMuPDF
Splits text into overlapping chunks
Generates vector embeddings
Stores vectors in FAISS
Makes document searchable

Documents are stored inside:

Source_Code/APP/saved_documents/
2. Retrieval-Augmented Question Answering

The chatbot:

Converts user queries into embeddings
Searches the FAISS index
Retrieves the most relevant document sections
Uses those sections to generate responses

This ensures answers are grounded in document content.

3. ARIA Intelligent Persona

The chatbot operates using:

ARIA (Adaptive Retrieval Intelligence Assistant)

ARIA is designed to:

Provide structured responses
Avoid hallucinated answers
Interpret complex queries
Ask for clarification when needed
Maintain professional industrial tone

This improves reliability and usability in technical environments.

4. Chrome Extension Interface

The system includes a Chrome extension that allows users to interact with the chatbot directly from the browser.

The extension:

Sends queries to Flask backend
Displays chatbot responses
Provides user-friendly interface
Enables quick document interaction

Key files:

chrome_extension/
├── content.js
├── content.css
├── manifest.json
├── icon.png
5. Multi-Document Management

Users can:

Upload documents
Load saved documents
Delete documents
Clear active document

These features allow persistent document handling.

Technologies Used
Backend
Python
Flask
Flask-CORS

Used for:

API development
Chat interaction
Document management
Language Model

StableLM Zephyr 3B

Used for:

Generating responses
Processing prompts
Synthesizing answers

Model:

stabilityai/stablelm-zephyr-3b
Embedding Model

Sentence Transformers

Model:

all-MiniLM-L6-v2

Used for:

Semantic similarity
Query retrieval
Document matching
Vector Database

FAISS

Used for:

Fast similarity search
Efficient vector indexing
Context retrieval
PDF Processing

PyMuPDF (fitz)

Used for:

Reading PDF files
Extracting document text
Handling multi-page documents
Frontend Interface

Chrome Extension

Used for:

User interaction
Sending queries
Displaying chatbot output
API Endpoints

The Flask backend exposes the following endpoints:

Health Check
GET /health

Returns:

System status
Active document
Number of indexed chunks
Upload PDF
POST /upload

Uploads and indexes a document.

List Documents
GET /documents

Returns all stored PDF files.

Load Document
POST /load_document

Loads a previously saved document.

Delete Document
POST /delete_document

Deletes a stored document.

Clear Active Document
POST /clear_document

Removes active document from memory.

Chat Interface
POST /chat

Main chatbot interaction endpoint.

Returns:

Generated response
Sources used
Active document name
Installation Guide
Step 1 — Clone Repository
git clone https://github.com/your-username/ARIA.git
cd ARIA
Step 2 — Install Dependencies

Navigate to:

Source_Code/APP

Then run:

pip install -r requirements.txt
Step 3 — Run Backend Server

Inside:

Source_Code/APP

Run:

python app.py

Server starts at:

http://localhost:5000
Step 4 — Load Chrome Extension
Open Chrome
Go to:
chrome://extensions/
Enable:
Developer Mode
Click:
Load unpacked
Select folder:
Source_Code/chrome_extension/

Extension will appear in toolbar.

How to Use
Upload Document

Upload a technical PDF through the extension or API.

The system will:

Save document
Extract text
Build vector index
Ask Questions

Type a question such as:

"What safety precautions are mentioned?"
"Explain the startup procedure."
"What are the maintenance steps?"

ARIA retrieves relevant sections and generates structured answers.

Configuration Parameters

These values define system behavior:

CHUNK_SIZE = 400
CHUNK_OVERLAP = 80
TOP_K = 4

They control:

Chunk length
Overlap size
Number of retrieved results
Example Use Cases

This chatbot can assist with:

Industrial manuals
Engineering documentation
Maintenance procedures
Safety protocols
Troubleshooting guides
Technical specifications

Example queries:

"List the startup steps."
"What causes overheating?"
"Explain safety precautions."
"Summarize maintenance procedure."
Strengths of This System

This implementation demonstrates:

Full RAG pipeline
Real-time document ingestion
Semantic search
LLM-powered reasoning
Persistent document storage
Browser-based chatbot interface

It simulates a real industrial knowledge assistant.

Future Improvements

Potential enhancements:

Multi-document simultaneous retrieval
Persistent FAISS index saving
Streaming responses
Web dashboard UI
Voice interaction
Model fine-tuning
PDF summarization mode
Project Purpose

This project demonstrates practical implementation of:

Retrieval-Augmented Generation
Prompt Engineering
Industrial AI Chatbots
Semantic Search Systems
Document Intelligence

It serves as an example of applying AI to industrial technical documentation workflows.
