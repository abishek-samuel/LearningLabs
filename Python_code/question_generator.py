import os
import json
import re
import requests

def extract_json_from_text(text):
    try:
        match = re.search(r'\{[\s\S]*\}', text)
        if match:
            return json.loads(match.group())
    except json.JSONDecodeError as e:
        print(f"⚠️ JSON decoding failed: {e}")
        return None
    return None

def split_text(text, chunk_size=3000, delimiter="-------------------"):
    raw_chunks = text.split(delimiter)
    final_chunks = []

    for raw_chunk in raw_chunks:
        clean_chunk = raw_chunk.strip()
        if not clean_chunk:
            continue

        if len(clean_chunk) <= chunk_size:
            final_chunks.append(clean_chunk)
        else:
            sub_chunks = [clean_chunk[i:i + chunk_size] for i in range(0, len(clean_chunk), chunk_size)]
            final_chunks.extend(sub_chunks)

    return final_chunks

def generate_mcqs_from_chunk(text_chunk, model="gemma3:27b", chunk_index=1, debug=False, count=5):
    system_prompt = f"""
You are an expert educator and question paper designer.

Important instructions:
- Use only valid JSON.
- All keys and string values must be enclosed in double quotes ("like this").
- No trailing commas.
- No comments or explanations.
- Output ONLY JSON.

Generate exactly **{count} MCQs** based on the text below. Each question must include:
- "difficulty": "beginner", "intermediate", or "advanced"
- A relevant and meaningful "question_text"
- 4 distinct options under "options"
- "correct_answer": "optionX"

Use this JSON format exactly:

{{
    "1": {{
        "difficulty": "beginner",
        "question_text": "What does CPU stand for in computing?",
        "options": {{
            "option1": "Central Processing Unit",
            "option2": "Computer Processing Utility",
            "option3": "Control Program Unit",
            "option4": "Central Programming Unit",
        }},
            "correct_answer": "option1"
    }},
    "2": {{
        "difficulty": "intermediate",
        "question_text": "Which of the following is NOT a feature of object-oriented programming?",
        "options": {{
            "option1": "Encapsulation",
            "option2": "Polymorphism",
            "option3": "Inheritance",
            "option4": "Compilation",
        }},
            "correct_answer": "option4"
    }},
    "3": {{
        "difficulty": "advanced",
        "question_text": "What is the time complexity of binary search on a sorted list of n elements?",
        "options": {{
            "option1": "O(n)",
            "option2": "O(log n)",
            "option3": "O(n log n)",
            "option4": "O(1)",
        }},
            "correct_answer": "option2"
    }}
}}

🧠 Generate {count} unique and insightful MCQs based on the following text. The questions must reflect actual understanding of the content.
Only return valid JSON. No extra explanation or comments.
"""
    prompt = f"{system_prompt}\n{text_chunk}"

    response = requests.post(
        "http://192.168.13.28:11434/api/generate",
        json={
            "model": "llama3.3:latest",
            "prompt": prompt,
            "stream": False
        }
    )

    if response.status_code == 200:
        raw_output = response.json().get("response", "")
        if debug:
            print(f"\n🧩 Raw response for chunk #{chunk_index}:\n", raw_output)
        return extract_json_from_text(raw_output)
    else:
        print(f"❌ API call failed for chunk #{chunk_index}: {response.status_code}")
        return None

def generate_mcqs_from_large_file(file_path, model="llama3:latest", debug=False, chunk_size=3000, count_per_chunk=4):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            full_text = f.read()

        chunks = split_text(full_text, chunk_size=chunk_size)
        total_chunks = len(chunks)
        print(f"📦 Splitting into {total_chunks} chunk(s) for {os.path.basename(file_path)}...")

        final_mcqs = {}
        question_number = 1

        for idx, chunk in enumerate(chunks):
            chunk_mcqs = generate_mcqs_from_chunk(
                text_chunk=chunk,
                model=model,
                chunk_index=idx + 1,
                debug=debug,
                count=count_per_chunk
            )

            if chunk_mcqs:
                for key in chunk_mcqs:
                    final_mcqs[str(question_number)] = chunk_mcqs[key]
                    question_number += 1

        return final_mcqs

    except Exception as e:
        print(f"⚠️ Error in processing file {file_path}: {e}")
        return None

def generate_all_questions_from_transcripts_folder(transcripts_folder, output_folder, model="llama3:latest", debug=False):
    try:
        files = [f for f in os.listdir(transcripts_folder) if f.endswith(".txt")]
        print(f"📚 Found {len(files)} transcript file(s) to process.")

        os.makedirs(output_folder, exist_ok=True)

        for file_name in files:
            module_name = os.path.splitext(file_name)[0]
            print(f"🛠️ Generating questions for {module_name}...")

            file_path = os.path.join(transcripts_folder, file_name)
            result = generate_mcqs_from_large_file(file_path, model=model, debug=debug)

            if result:
                output_file = os.path.join(output_folder, f"{module_name}_questions.json")
                with open(output_file, "w", encoding="utf-8") as f:
                    json.dump(result, f, indent=4, ensure_ascii=False)

                print(f"✅ Saved questions for {module_name} to {output_file}")
            else:
                print(f"⚠️ No questions generated for {module_name}.")

    except Exception as e:
        print(f"🔥 Error during question generation: {e}")

# ✅ Hardcoding the folder paths
transcripts_folder = "module_transcripts"  # or "video_transcripts", whichever one you are using
output_folder = "generated_questions"

# Create output folder if it doesn't exist
os.makedirs(output_folder, exist_ok=True)

# generate_all_questions_from_transcripts_folder(transcripts_folder, output_folder)

