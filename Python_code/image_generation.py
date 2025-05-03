import os
from io import BytesIO
from PIL import Image, UnidentifiedImageError
from google import genai
from google.genai import types
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Load API key from environment variable
api_key = os.getenv("AISTUDIO_API_KEY")
if not api_key:
    raise EnvironmentError("API key not found. Please set the 'AISTUDIO_API_KEY' environment variable.")

# Initialize Gemini client
client = genai.Client(api_key=api_key)

# Image generation function
def generate_course_image(course_id: int, course_title: str, course_description: str) -> dict:
    """
    Generates a 3D-style image for a course using Gemini and saves it to uploads/course_images/
    """
    contents = (
        f"Please generate a 3D visual representation for the course titled '{course_title}'. "
        f"Use the following description to understand the course content, but do not include any text from the description in the image itself. "
        f"Description: {course_description}"
    )

    print("✅ Inside image generation function")
    saved_paths = []

    for i in range(4):  # Generate 4 images
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp-image-generation",
            contents=contents,
            config=types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"])
        )

        result = {"text": "", "saved_path": ""}

        for part in response.candidates[0].content.parts:
            print(f"🔍 Checking part: text={part.text is not None}, inline_data={part.inline_data is not None}")
            
            if part.text is not None:
                result["text"] = part.text

            elif part.inline_data is not None:
                try:
                    # Optional: check mime type if needed
                    mime_type = getattr(part.inline_data, "mime_type", "")
                    if not mime_type.startswith("image/"):
                        print(f"⚠️ Skipping non-image data with mime type: {mime_type}")
                        continue

                    image_data = part.inline_data.data
                    image = Image.open(BytesIO(image_data))

                    # Save image to uploads/course_images
                    save_dir = os.path.abspath(os.path.join(os.getcwd(), "..", "uploads", "course-images"))
                    os.makedirs(save_dir, exist_ok=True)

                    filename = f"{course_id}_{course_title.replace(' ', '_')}_{i+1}.png"
                    save_path = os.path.join(save_dir, filename)

                    image.save(save_path)
                    saved_paths.append(save_path)
                    result["saved_path"] = save_path
                    print(f"✅ Image saved at: {save_path}")
                    conn = psycopg2.connect(db_url)
                    cursor = conn.cursor()

                    relative_path = os.path.relpath(save_path, start='C:/github/LearningLabs')
                    url_path = relative_path.replace('\\', '/')  # ensure forward slashes
                    thumbnail_url = f"http://localhost:5000/{url_path}"

                    # update_query = "UPDATE courses SET thumbnail = %s WHERE id = %s"
                    # cursor.execute(update_query, (thumbnail_url, course_id))
                    # conn.commit()

                    print(f"📝 Thumbnail updated for course ID {course_id}")

                except UnidentifiedImageError as e:
                    print(f"❌ Unidentified image data: {e}")
                    continue  # Skip non-image inline data
    conn.close()

    if not result["saved_path"]:
        raise RuntimeError("Image generation failed: No valid image returned by the model.")

    return  saved_paths