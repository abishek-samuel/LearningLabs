import requests
import os

def get_module_summary(module_id):
    """Fetch summary from module_summaries/module<id>_summary.txt"""
    try:
        filename = f"module_summaries/module{module_id}_summary.txt"
        with open(filename, "r", encoding="utf-8") as file:
            return file.read()
    except FileNotFoundError:
        print(f"⚠️ Summary file not found for module_id: {module_id}")
        return ""


def chat(question, module_id="", history=[]):
    """
    Sends a chat request to the LLM server and returns the response.
    """

    system_prompt = (
        "You are an expert course assistant. Always answer based on the provided course content only."
    )

    # Fetch context (module summary)
    context = get_module_summary(module_id)

    # Build history string
    history_str = ""
    for q, a in history:
        history_str += f"Q: {q}\nA: {a}\n"

    # Build final prompt
    prompt = (
        f"{system_prompt}\n"
        f"Context:\n{context.strip()}\n\n"
        f"Previous Q&A History:\n{history_str}\n\n"
        f"Question: {question.strip()}"
    )

    try:
        response = requests.post(
            "http://192.168.0.65:11434/api/generate",
            json={
                "model": "gemma3:27b",
                "prompt": prompt,
                "stream": False
            }
        )
        result = response.json().get("response", "Sorry, no answer found.")
        return {"success": True, "response": result}

    except Exception as e:
        return {"success": False, "response": f"Error: {str(e)}"}
