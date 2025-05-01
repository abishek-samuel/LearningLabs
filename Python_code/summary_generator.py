import os
import requests
import json
import re
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")

# Step 1: Define folders
video_transcripts_folder = "video_transcripts"
module_transcripts_folder = "module_transcripts"
video_summaries_folder = "video_summaries"
module_summaries_folder = "module_summaries"

#Ensure output folders exist
os.makedirs(video_summaries_folder, exist_ok=True)
os.makedirs(module_summaries_folder, exist_ok=True)

def update_lesson_summary_by_video_file(filepath, summary):
    try:
        # Extract filename from full path
        filename = os.path.basename(filepath)

        # Extract unique video ID from filename
        match = re.search(r"(video-\d+-\d+)", filename)
        if not match:
            print(f"⚠️ Could not extract video ID from filename: {filename}")
            return

        video_id = match.group(1)
        print(f"🔍 Extracted video ID: {video_id}")

        # Connect to DB
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()

        query = """
            UPDATE lessons
            SET summary = %s
            WHERE video_url LIKE %s
        """
        like_pattern = f"%{video_id}%"  # Matches partial video URL
        cursor.execute(query, (summary, like_pattern))

        if cursor.rowcount > 0:
            print(f"✅ Updated summary for {cursor.rowcount} lesson(s) with video_id: {video_id}")
        else:
            print(f"⚠️ No lessons found with video_id: {video_id}")

        conn.commit()
        cursor.close()
        conn.close()

    except Exception as e:
        print(f"❌ Failed to update DB: {e}")


# Step 2: Function to split text into manageable chunks
def chunk_text(text, max_words=800):
    sentences = text.split('. ')
    chunks, chunk = [], ""
    for sentence in sentences:
        if len(chunk.split()) + len(sentence.split()) < max_words:
            chunk += sentence + '. '
        else:
            chunks.append(chunk.strip())
            chunk = sentence + '. '
    if chunk:
        chunks.append(chunk.strip())
    return chunks

# Step 3: Function to summarize using Ollama LLaMA 3
def summarize_with_ollama(chunk):
    prompt = f"Summarize the following text:\n\n{chunk.strip()}\n\nSummary:"
    response = requests.post(
        "http://192.168.13.28:11434/api/generate",
        headers={"Content-Type": "application/json"},
        data=json.dumps({
            "model": "llama3.3:latest",
            "prompt": prompt,
            "stream": False
        })
    )
    if response.status_code == 200:
        return response.json()['response'].strip()
    else:
        print(f"❌ Error: {response.status_code}, {response.text}")
        return "[Summary failed]"

# Step 4: Summarize transcripts from a folder if not already summarized
def summarize_folder(input_folder, output_folder, isVideo):
    if not os.path.exists(input_folder):
        print(f"⚠️ Folder not found: {input_folder}. Skipping summarization.")
        return

    files = [f for f in os.listdir(input_folder) if f.endswith(".txt")]
    if not files:
        print(f"⚠️ No transcripts found in {input_folder}. Skipping summarization.")
        return

    print(f"📄 Found {len(files)} transcript(s) in {input_folder} to process...")

    for file_name in files:
        input_path = os.path.join(input_folder, file_name)
        output_file_name = file_name.replace("_transcript", "_summary")
        output_path = os.path.join(output_folder, output_file_name)

        # Check if summary already exists
        if os.path.exists(output_path):
            print(f"⏩ Summary already exists for {file_name}. Skipping...")
            continue

        print(f"🔹 Summarizing: {file_name}")

        with open(input_path, "r", encoding="utf-8") as f:
            text = f.read()

        if not text.strip():
            print(f"⚠️ Empty transcript: {file_name}. Skipping.")
            continue

        chunks = chunk_text(text)
        summaries = []
        for i, chunk in enumerate(chunks):
            summary = summarize_with_ollama(chunk)
            summaries.append(summary)
            print(f"  ✅ Chunk {i+1} summarized")

        summary_text = "\n\n".join(summaries)

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(summary_text)
            if(isVideo):
                update_lesson_summary_by_video_file(output_path, summary_text)

        print(f"✅ Saved summary to: {output_path}")

# # Step 5: Run summarization for video and module transcripts
# print("\n🚀 Summarizing Video Transcripts...")
# summarize_folder(video_transcripts_folder, video_summaries_folder)

# print("\n🚀 Summarizing Module Transcripts...")
# summarize_folder(module_transcripts_folder, module_summaries_folder)
