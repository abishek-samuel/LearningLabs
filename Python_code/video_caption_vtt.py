import whisper
import os
import pathlib

def generate_vtt_from_video(video_path: str, output_dir: str):
    # Convert relative path to absolute
    video_path = video_path.strip("/").replace("/", os.sep)
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    abs_video_path = os.path.join(base_dir, video_path)
    abs_video_path = pathlib.Path(abs_video_path)

    output_dir = pathlib.Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if not abs_video_path.exists():
        print(f"❌ Error: File not found - {abs_video_path}")
        return

    # Check if the VTT file already exists
    vtt_path = output_dir / (abs_video_path.stem + ".vtt")
    if vtt_path.exists():
        print(f"✅ VTT file already exists: {vtt_path}. Skipping transcription.")
        return

    try:
        # Load Whisper model
        print("🔄 Loading Whisper model...")
        model = whisper.load_model("base")

        # Transcribe video
        print(f"🎙️ Transcribing: {abs_video_path.name}")
        result = model.transcribe(str(abs_video_path))

        # Format timestamp for VTT
        def format_vtt_timestamp(seconds):
            hrs = int(seconds // 3600)
            mins = int((seconds % 3600) // 60)
            secs = int(seconds % 60)
            msec = int((seconds - int(seconds)) * 1000)
            return f"{hrs:02}:{mins:02}:{secs:02}.{msec:03}"

        # Save VTT file
        vtt_path = output_dir / (abs_video_path.stem + ".vtt")
        with open(vtt_path, "w", encoding="utf-8") as vtt_file:
            vtt_file.write("WEBVTT\n\n")
            for segment in result["segments"]:
                start = format_vtt_timestamp(segment["start"])
                end = format_vtt_timestamp(segment["end"])
                text = segment["text"].strip()
                vtt_file.write(f"{start} --> {end}\n{text}\n\n")

        print(f"✅ VTT subtitles saved to: {vtt_path}")

    except Exception as e:
        print(f"❌ Error during transcription: {e}")
