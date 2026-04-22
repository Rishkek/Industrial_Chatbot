import warnings
import torch
import logging
import os
import shutil

warnings.filterwarnings("ignore")
logging.getLogger("transformers").setLevel(logging.ERROR)

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from transformers import pipeline, AutoTokenizer
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import fitz  # PyMuPDF

app = Flask(__name__)
CORS(app)

# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------
PERSONA = """You are ARIA (Adaptive Retrieval Intelligence Assistant), 
an expert-grade industrial AI assistant designed for 
technical document retrieval, reasoning, and precision-based responses.

CORE IDENTITY:
ARIA is analytical, confident, structured, and technically fluent.
You operate like a professional industrial knowledge engineer —
precise, reliable, and efficient.

PRIMARY FUNCTION:
You answer user questions strictly using the provided document context.
You retrieve relevant technical knowledge, interpret it logically,
and present it clearly in structured, industrial-grade language.

You NEVER invent information.
If the answer is not available in the provided context,
you explicitly state:
"The requested information is not available in the provided documents."

--------------------------------------------

INTELLIGENCE & INTERPRETATION BEHAVIOR:

You do not simply match keywords — you interpret intent.

When a user asks a question:
1. Analyze what the user is trying to accomplish.
2. Infer missing context logically if supported by documents.
3. Break complex questions into smaller technical components.
4. Retrieve the most relevant sections from context.
5. Synthesize a structured and technically correct answer.

If a question is complex or multi-part:
• Decompose it into logical sub-questions
• Answer each part systematically
• Present results clearly using structured formatting

--------------------------------------------

RESPONSE LENGTH ADAPTATION:

You dynamically adjust response detail based on the user's request.

Short Questions:
→ Provide concise, direct answers.

Technical Questions:
→ Provide structured explanations.

Complex Questions:
→ Provide step-by-step breakdowns.

Definition Questions:
→ Provide precise technical definitions.

Design / Architecture Questions:
→ Provide organized, layered explanations.

Always aim for:
Clarity > Precision > Efficiency

--------------------------------------------

COMMUNICATION STYLE:

Your responses are:

• Structured
• Logical
• Technically accurate
• Easy to scan
• Industrial in tone

Use:

• Bullet points
• Numbered steps
• Section headings
• Technical terminology

Avoid:

• Unnecessary verbosity
• Informal language
• Guessing
• Speculation

--------------------------------------------

CONTEXT-STRICT RESPONSE POLICY:

All answers MUST come from the provided document context.

Allowed:
• Paraphrasing
• Summarizing
• Reorganizing technical content
• Combining related document sections

Not Allowed:
• External knowledge
• Assumptions not supported by context
• Fabricated examples

If insufficient data exists:

Respond with:

"Insufficient information found in the provided documents to answer this question."

--------------------------------------------

SMART CLARIFICATION LOGIC:

If the user's question is:

• Ambiguous
• Incomplete
• Poorly phrased
• Multi-interpretational

You MUST request clarification before answering.

Example behavior:

"Your request appears ambiguous.
Could you clarify whether you are referring to [Option A] or [Option B]?"

Never guess unclear intent.

--------------------------------------------

FOLLOW-UP ASSISTANCE BEHAVIOR:

After answering a question,
you always remain assistive and proactive.

At the end of responses, include:

"Would you like further clarification, additional details, or help with another query?"

If the topic allows extension, suggest:

• Related steps
• Deeper explanations
• Adjacent technical topics

--------------------------------------------

TECHNICAL REASONING STYLE:

When explaining technical material:

You:

• Identify the relevant concept
• Extract supporting statements
• Explain relationships
• Maintain engineering-level precision

Use structured logic such as:

Step 1 → Identify relevant concept  
Step 2 → Explain mechanism  
Step 3 → Provide result or interpretation  

--------------------------------------------

ERROR PREVENTION MODE:

Before producing an answer:

You internally verify:

• Is the answer supported by context?
• Is the reasoning logically consistent?
• Are all steps technically valid?

If confidence is low:
Ask for clarification instead of answering.

--------------------------------------------

OUTPUT FORMATTING STANDARD:

Use structured formatting whenever possible.

Preferred structure:

Answer:
[Clear explanation]

Key Points:
• Point 1
• Point 2
• Point 3

If applicable:

Steps:
1. Step one
2. Step two
3. Step three

--------------------------------------------

USER INTENT SENSING:

You estimate:

• What the user wants to achieve
• How detailed the response should be
• Whether they need explanation, summary, or procedure

Indicators:

Short input → concise output  
Long technical input → detailed output  
Design-style input → structured architecture output  

--------------------------------------------

INDUSTRIAL PROFESSIONALISM MODE:

Maintain:

• Engineering-grade communication
• Reliability-focused reasoning
• Documentation-style responses

Think like:

• Industrial technical assistant
• Engineering documentation system
• Knowledge retrieval specialist

--------------------------------------------

FINAL RESPONSE RULE:

Every response must satisfy:

✓ Correct  
✓ Context-supported  
✓ Structured  
✓ Useful  
✓ Professional  

And must end with:

"Would you like further clarification or assistance with another topic?"""

MODEL_ID       = "stabilityai/stablelm-zephyr-3b"
EMBED_MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"
CHUNK_SIZE     = 400
CHUNK_OVERLAP  = 80
TOP_K          = 4

# Saved documents folder sits next to app.py
BASE_DIR       = os.path.dirname(os.path.abspath(__file__))
DOCS_DIR       = os.path.join(BASE_DIR, "saved_documents")
os.makedirs(DOCS_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Boot models
# ---------------------------------------------------------------------------
print("🧠 Loading StableLM Zephyr 3B...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
pipe = pipeline(
    "text-generation",
    model=MODEL_ID,
    tokenizer=tokenizer,
    torch_dtype=torch.float16,
    device_map="auto",
    max_new_tokens=512,
    temperature=0.7,
    do_sample=True,
    return_full_text=False,
)
print("✅ LLM ready.")

print("📦 Loading embedding model...")
embedder = SentenceTransformer(EMBED_MODEL_ID)
print("✅ Embedder ready.\n")

# ---------------------------------------------------------------------------
# RAG state
# ---------------------------------------------------------------------------
faiss_index = None
doc_chunks  = []
doc_name    = None

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def chunk_text(text: str) -> list[str]:
    chunks, start = [], 0
    while start < len(text):
        chunks.append(text[start:start + CHUNK_SIZE].strip())
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return [c for c in chunks if len(c) > 30]


def build_faiss_index(chunks: list[str]):
    embeddings = embedder.encode(chunks, show_progress_bar=False,
                                 convert_to_numpy=True).astype(np.float32)
    index = faiss.IndexFlatL2(embeddings.shape[1])
    index.add(embeddings)
    return index


def retrieve(query: str, k: int = TOP_K) -> list[str]:
    if faiss_index is None or not doc_chunks:
        return []
    q = embedder.encode([query], convert_to_numpy=True).astype(np.float32)
    _, idxs = faiss_index.search(q, k)
    return [doc_chunks[i] for i in idxs[0] if i < len(doc_chunks)]


def index_pdf_bytes(pdf_bytes: bytes) -> tuple[list[str], object]:
    """Extract text from PDF bytes, chunk, and build index. Returns (chunks, index)."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    full_text = "".join(page.get_text() for page in doc)
    doc.close()
    if not full_text.strip():
        raise ValueError("PDF appears to be empty or image-only (no extractable text).")
    chunks = chunk_text(full_text)
    index  = build_faiss_index(chunks)
    return chunks, index


def build_prompt(history: list[dict], user_input: str,
                 context_chunks: list[str]) -> str:
    context_block = ""
    if context_chunks:
        joined = "\n\n---\n\n".join(context_chunks)
        context_block = (
            f"\n\n[DOCUMENT CONTEXT — use this to answer the question]\n"
            f"{joined}\n[END OF CONTEXT]"
        )

    prompt = f"<|system|>\n{PERSONA}{context_block}\n<|endoftext|>\n"
    for turn in history[-6:]:
        prompt += f"<|user|>\n{turn['user']}\n<|endoftext|>\n"
        prompt += f"<|assistant|>\n{turn['assistant']}\n<|endoftext|>\n"
    prompt += f"<|user|>\n{user_input}\n<|endoftext|>\n<|assistant|>\n"
    return prompt


def clean_response(text: str) -> str:
    for tok in ["<|endoftext|>", "<|user|>", "<|assistant|>", "<|system|>"]:
        text = text.replace(tok, "")
    return text.strip()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "document": doc_name,
        "chunks_indexed": len(doc_chunks)
    })


# ── Document management ───────────────────────────────────────────────────

@app.route("/documents", methods=["GET"])
def list_documents():
    """List all PDFs saved in saved_documents/."""
    files = [f for f in os.listdir(DOCS_DIR) if f.lower().endswith(".pdf")]
    files.sort()
    return jsonify({"documents": files})


@app.route("/upload", methods=["POST"])
def upload():
    """Accept a PDF, save it to saved_documents/, and index it."""
    global faiss_index, doc_chunks, doc_name

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Only PDF files are supported"}), 400

    try:
        pdf_bytes = file.read()

        # Save to disk
        save_path = os.path.join(DOCS_DIR, file.filename)
        with open(save_path, "wb") as f:
            f.write(pdf_bytes)

        # Index
        doc_chunks, faiss_index = index_pdf_bytes(pdf_bytes)
        doc_name = file.filename

        print(f"📄 Saved & indexed '{doc_name}' → {len(doc_chunks)} chunks")
        return jsonify({
            "message": f"'{doc_name}' saved and indexed.",
            "chunks": len(doc_chunks)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/load_document", methods=["POST"])
def load_document():
    """Re-index a previously saved document by filename."""
    global faiss_index, doc_chunks, doc_name

    data = request.get_json()
    filename = (data or {}).get("filename", "").strip()
    if not filename:
        return jsonify({"error": "No filename provided"}), 400

    path = os.path.join(DOCS_DIR, filename)
    if not os.path.exists(path):
        return jsonify({"error": f"'{filename}' not found in saved_documents/"}), 404

    try:
        with open(path, "rb") as f:
            pdf_bytes = f.read()

        doc_chunks, faiss_index = index_pdf_bytes(pdf_bytes)
        doc_name = filename

        print(f"🔄 Re-indexed '{doc_name}' → {len(doc_chunks)} chunks")
        return jsonify({
            "message": f"'{doc_name}' loaded and indexed.",
            "chunks": len(doc_chunks)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/delete_document", methods=["POST"])
def delete_document():
    """Delete a saved document from disk."""
    global faiss_index, doc_chunks, doc_name

    data = request.get_json()
    filename = (data or {}).get("filename", "").strip()
    if not filename:
        return jsonify({"error": "No filename provided"}), 400

    path = os.path.join(DOCS_DIR, filename)
    if not os.path.exists(path):
        return jsonify({"error": "File not found"}), 404

    os.remove(path)

    # If it was the active doc, clear the index
    if doc_name == filename:
        faiss_index = None
        doc_chunks  = []
        doc_name    = None

    return jsonify({"message": f"'{filename}' deleted."})


@app.route("/clear_document", methods=["POST"])
def clear_document():
    """Eject the active document from memory (doesn't delete from disk)."""
    global faiss_index, doc_chunks, doc_name
    faiss_index = None
    doc_chunks  = []
    doc_name    = None
    return jsonify({"message": "Active document cleared."})


# ── Chat ──────────────────────────────────────────────────────────────────

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON body"}), 400

    user_input = data.get("message", "").strip()
    history    = data.get("history", [])

    if not user_input:
        return jsonify({"error": "Empty message"}), 400

    try:
        context_chunks = retrieve(user_input)
        prompt         = build_prompt(history, user_input, context_chunks)
        outputs        = pipe(prompt)
        response       = clean_response(outputs[0]["generated_text"])

        return jsonify({
            "response": response,
            "sources_used": len(context_chunks),
            "document": doc_name
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print(f"📁 Documents folder: {DOCS_DIR}")
    app.run(host="0.0.0.0", port=5000, debug=False)