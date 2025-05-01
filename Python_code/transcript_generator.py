import os
import whisper
import subprocess
from pathlib import Path
import PyPDF2
from collections import defaultdict

# Load Whisper model once
print("🔄 Loading Whisper model...")
model = whisper.load_model("base")
print("✅ Whisper model loaded.")

def get_file_type(file_path):
    ext = file_path.lower().split('.')[-1]
    print(f"📁 Determining file type for: {file_path} -> {ext}")
    if ext == 'pdf':
        return 'pdf'
    elif ext in ['mp4', 'mkv', 'avi', 'mov']:
        return 'video'
    elif ext in ['mp3', 'wav', 'ogg', 'flac', 'm4a']:
        return 'audio'
    else:
        return 'unsupported'

def extract_text_from_pdf(pdf_path):
    print(f"📄 Extracting text from PDF: {pdf_path}")
    text = ""
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text()
                print(f"   🔸 Page {i + 1} text length: {len(page_text) if page_text else 0}")
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        print(f"❌ Error extracting PDF text: {e}")
    return text.strip()

def convert_to_wav(input_path, output_label):
    output_path = f"{output_label}.wav"
    default_ffmpeg = "ffmpeg"
   # custom_ffmpeg = "C:/Users/yravi/Documents/ffmpeg-7.1.1-essentials_build/bin/ffmpeg.exe"
    ffmpeg_path = custom_ffmpeg if os.path.exists(default_ffmpeg) else default_ffmpeg

    print(f"🎞️ Converting to WAV: {input_path} -> {output_path}")
    try:
        command = [ffmpeg_path, "-y", "-i", input_path, output_path]
        subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Error converting file: {e}")
        return None
    return output_path

def transcribe_with_whisper(audio_path):
    print(f"🧠 Transcribing with Whisper: {audio_path}")
    try:
        result = model.transcribe(audio_path)
        print(f"📝 Transcription result length: {len(result['text'])}")
        return result["text"].strip()
    except Exception as e:
        print(f"❌ Error transcribing audio: {e}")
        return ""

def generate_transcripts(incoming_data, transcript_folder="module_transcripts"):
    print(f"🧾 Generating transcripts in: {transcript_folder}")

    # Ensure output directories exist
    os.makedirs(transcript_folder, exist_ok=True)
    os.makedirs("video_transcripts", exist_ok=True)

    # Sort and group data
    sorted_data = sorted(incoming_data, key=lambda x: (x["module_id"], x["position"]))
    modules = defaultdict(list)
    for item in sorted_data:
        modules[item["module_id"]].append(item)

    for module_id, files in modules.items():
        print(f"\n📁 Processing Module {module_id} with {len(files)} files...")
        combined_text = ""

        for item in files: 
            position = item["position"]
            relative_path = item["path"]
            path = relative_path.strip("/").replace("/", os.sep)

            # Get base directory (i.e., LMS folder)
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

            # Join to form the correct absolute path
            full_path = os.path.join(base_dir, path)

            print(f"full_path {full_path}")

            file_type = get_file_type(full_path)

            print(f"  🔹 Position {position} - {path} ({file_type})")

            try:
                text = ""
                if file_type == 'pdf':
                    text = extract_text_from_pdf(path)

                elif file_type in ['audio', 'video']:
                    wav_label = f"temp_module{module_id}_pos{position}"
                    wav_path = convert_to_wav(full_path, wav_label)
                    if wav_path:
                        text = transcribe_with_whisper(wav_path)
                        os.remove(wav_path)
                        print(f"🧹 Removed temporary WAV: {wav_path}")
                    else:
                        text = f"[Error: Conversion failed for {relative_path}]"

                else:
                    text = f"[Unsupported file type: {relative_path}]"

                # 📄 Save individual transcript
                filename = Path(path).stem
                individual_transcript_path = os.path.join("video_transcripts", f"{filename}_transcript.txt")
                with open(individual_transcript_path, "w", encoding="utf-8") as f:
                    f.write(text)
                print(f"✅ Saved individual transcript: {individual_transcript_path}")

                # 📌 Add to combined text for module
                combined_text += f"📌 Position {position} - {Path(path).name}\n"
                combined_text += text + "\n"
                combined_text += "-" * 40 + "\n\n"

            except Exception as e:
                print(f"❌ Error processing {path}: {e}")
                combined_text += f"⚠️ Error processing {relative_path}: {str(e)}\n"
                combined_text += "-" * 40 + "\n\n"

        # Save combined module transcript
        transcript_path = os.path.join(transcript_folder, f"module{module_id}_transcript.txt")
        with open(transcript_path, "w", encoding="utf-8") as f:
            f.write(combined_text)
        print(f"✅ Saved combined module transcript: {transcript_path}")
