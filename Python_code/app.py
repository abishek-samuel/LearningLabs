from flask import Flask, request, jsonify
import psycopg2
import os
from dotenv import load_dotenv
from question_insertion import insert_questions
from transcript_generator import generate_transcripts
from question_generator import generate_all_questions_from_transcripts_folder  # Import correct function
from summary_generator import summarize_folder  # ⚡ Add this line
from flask_cors import CORS
from llm_handler import chat
from image_generation import generate_course_image
from video_caption_vtt import generate_vtt_from_video
from pathlib import Path
from recommender_system import get_recommendations

app = Flask(__name__)
CORS(app)
load_dotenv()

@app.route("/api/course-summaries/<int:course_id>", methods=["GET"])
def get_course_summaries(course_id):
    try:
        # Connect to DB to get module IDs for this course
        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        cursor = conn.cursor()
        
        # Get all module IDs for the course
        cursor.execute("SELECT id FROM modules WHERE course_id = %s ORDER BY position", (course_id,))
        module_ids = [row[0] for row in cursor.fetchall()]
        
        summaries = []
        for module_id in module_ids:
            try:
                with open(f"module_summaries/module{module_id}_summary.txt", "r", encoding="utf-8") as f:
                    summary = f.read().strip()
                    if summary:
                        summaries.append(summary
                        )
            except FileNotFoundError:
                print(f"⚠️ No summary found for module {module_id}")
                continue
                
        cursor.close()
        conn.close()
        
        return jsonify({
            "success": True,
            "summaries": summaries
        })
        
    except Exception as e:
        print(f"❌ Error getting summaries: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/generate_image", methods=["POST"])
def generate_image_endpoint():
    """Flask API endpoint to generate and save an image"""
    try:
        data = request.get_json()
        course_id = data.get("course_id")
        course_title = data.get("course_title", "")
        course_description = data.get("course_description", "")

        print(f"🚀 Generating image for course: {course_title}")
        result = generate_course_image(course_id,course_title,course_description)

        return jsonify({
            "success": True,
            "message": "Image generated and saved successfully.",
            "saved_paths": result
        }), 200  # ✅ Return success message with HTTP 200

    except Exception as e:
        print(f"🔥 Error in image generation: {e}")
        return jsonify({"success": False, "error": str(e)}), 500



@app.route("/api/chat", methods=["POST"])
def chat_api():
    data = request.get_json()

    if not data or "question" not in data:
        return jsonify({"success": False, "error": "question is required"}), 400

    question = data["question"]
    module_id = data.get("moduleId", "")
    history = data.get("history", [])

    print("module id: ",module_id)
    

    print(f"💬 Chat request: {question}")

    try:
        chat_response = chat(question, module_id, history)
        return jsonify(chat_response)
    except Exception as e:
        print(f"🔥 Chat Error: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/insert_questions", methods=["POST"])
def insert_questions_api():
    data = request.get_json()

    if not data or "course_id" not in data:
        return jsonify({"success": False, "error": "course_id is required"}), 400

    course_id = data["course_id"]
    db_url = os.getenv("DATABASE_URL")
    print(f"📥 Received request to insert questions for course_id: {course_id}")

    result = {
        "modules": [],
        "video_data": [],
        "questions_inserted": []
    }

    try:
        # Step 1: Connect and get module IDs
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        cur.execute("SELECT id FROM modules WHERE course_id = %s", (course_id,))
        module_ids = [row[0] for row in cur.fetchall()]
        print(f"📦 Found Module IDs: {module_ids}")

        if not module_ids:
            return jsonify({"success": False, "error": "⚠️ No modules found for this course."}), 404

        result["messages"] = [f"📦 Found {len(module_ids)} modules."]

        # Step 2: Get video URLs
        video_data = []
        for module_id in module_ids:
            cur.execute("SELECT video_url, position FROM lessons WHERE module_id = %s", (module_id,))
            rows = cur.fetchall()
            videos = [{"path": row[0], "position": row[1]} for row in rows]
            result["modules"].append({
                "module_id": module_id,
                "videos": videos
            })
            for video in videos:
                if video.get("path"):
                    video_data.append({
                        "module_id": module_id,
                        "path": video["path"],
                        "position": video["position"]
                    })
                    generate_vtt_from_video(video["path"], '../uploads/captions')

        cur.close()
        conn.close()

        # Step 3: Generate transcripts (Optional: Can be skipped if transcripts are pre-generated)
        print(f"🎯 Total videos to transcribe: {len(video_data)}")
        generate_transcripts(video_data, "module_transcripts")

        # Step 4: Generate summaries after transcripts
        print(f"📝 Generating summaries for transcripts...")

        video_transcripts_folder = "video_transcripts"
        module_transcripts_folder = "module_transcripts"
        video_summaries_folder = "video_summaries"
        module_summaries_folder = "module_summaries"

        # Create output folders if not exist
        os.makedirs(video_summaries_folder, exist_ok=True)
        os.makedirs(module_summaries_folder, exist_ok=True)

        # Summarize video transcripts
        summarize_folder(video_transcripts_folder, video_summaries_folder, True)

        # Summarize module transcripts
        summarize_folder(module_transcripts_folder, module_summaries_folder, False)

        # Step 5: Insert questions
        print(f"🔎 Checking for generated questions...")

        folder_path = "generated_questions"

        # Check if folder exists
        if not os.path.exists(folder_path) or not os.listdir(folder_path):
            print(f"📂 '{folder_path}' not found or empty. Generating MCQs from transcripts...")

            # Generate MCQs
            transcripts_folder = "module_transcripts"
            output_folder = folder_path
            os.makedirs(output_folder, exist_ok=True)

            generate_all_questions_from_transcripts_folder(transcripts_folder, output_folder)

        # Now read json files
        json_files = [f for f in os.listdir(folder_path) if f.endswith(".json")]

        if not json_files:
            raise Exception("⚠️ No generated MCQ files found even after generation!")

        for idx, json_file in enumerate(sorted(json_files)):
            module_id = module_ids[idx] if idx < len(module_ids) else None
            if not module_id:
                print(f"⚠️ No module ID available for file {json_file}")
                continue

            full_path = os.path.join(folder_path, json_file)
            print("full path  -------------------", full_path)

            # Insert questions into the database
            insertion_result = insert_questions(
                json_file_path=full_path,
                course_id=course_id,
                module_ids=[module_id],
                db_url=db_url
            )

            result["questions_inserted"].append({
                "module_id": module_id,
                "file": json_file,
                "status": "Inserted Successfully" if insertion_result.get("success") else "Failed"
            })

        return jsonify({
            "success": True,
            "message": "✅ Questions inserted, transcripts and summaries generated.",
            "video_data": video_data,
            "messages": result["messages"],
            "questions_inserted": result["questions_inserted"]
        })

    except Exception as e:
        print(f"🔥 Error: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/recommend', methods=['POST'])
def recommend():
    try:
        data = request.get_json()
        role = data.get('role')
        user_id = data.get('user_id')

        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400

        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        cursor = conn.cursor()

        # 🔹 Step 1: Fetch accessible courses (with or without user_id)
        if role=="admin":
            cursor.execute("""
                SELECT id, title, description
                FROM courses
            """)
        else:
            cursor.execute("""
                SELECT c.id, c.title, c.description
                FROM course_access ca
                JOIN courses c ON ca.course_id = c.id
                WHERE ca.user_id = %s
            """, (user_id,))


        accessible_courses = [{'id': cid, 'title': title, 'description': desc} for cid, title, desc in cursor.fetchall()]

        # 🔹 Step 2: Fetch enrolled course titles
        cursor.execute("""
            SELECT c.title
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            WHERE e.user_id = %s
        """, (user_id,))
        enrolled_titles = [row[0] for row in cursor.fetchall()]

        cursor.close()
        conn.close()

        if not accessible_courses or not enrolled_titles:
            return jsonify({'recommended_courses': []})

        # print("accessible",accessible_courses)
        # print("enrolled_titles",enrolled_titles)

        recommendations = get_recommendations(accessible_courses, enrolled_titles)
        return jsonify({'recommended_courses': recommendations})

    except Exception as e:
        print(f"❌ Error getting recommendations: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == "__main__":
    app.run(debug=True, port=5001)
