import psycopg2
import json
from dotenv import load_dotenv
import os

load_dotenv()

def insert_questions(json_file_path, course_id, module_ids, db_url=os.getenv("DATABASE_URL")):
    result = {
        "questions_inserted": 0,
        "messages": []
    }
# cur.execute("DELETE FROM questions")
    try:
        print(f"🔌 Connecting to DB for insertion...")
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()

        # Load JSON data
        with open(json_file_path, "r") as file:
            json_data = json.load(file)
        print(f"📂 Loaded {len(json_data)} questions from {json_file_path}")

        if not json_data:
            result["messages"].append("⚠️ No data found in the JSON file.")
            return result

        # Clear old data
        # cur.execute("DELETE FROM questions")
        result["messages"].append("🧹 Cleared existing data from 'questions'.")

        module_count = len(module_ids)

        for idx, (q_id, q_data) in enumerate(json_data.items()):
            module_id = module_ids[idx % module_count]

            question_text = q_data.get("question_text")
            difficulty = q_data.get("difficulty")
            options = q_data.get("options", {})
            correct_answer = q_data.get("correct_answer")
            explanation = q_data.get("explanation", None)

            if not question_text or not correct_answer:
                print(f"⚠️ Skipping question {q_id} due to missing text or correct answer.")
                continue

            # Insert into questions table
            cur.execute("""
                INSERT INTO questions (module_id, question_text, difficulty, options, correct_answer, explanation, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
            """, (
                module_id,
                question_text,
                difficulty,
                json.dumps(options, ensure_ascii=False),  
                correct_answer,
                explanation
            ))

            result["questions_inserted"] += 1

        conn.commit()
        result["messages"].append(f"✅ Inserted {result['questions_inserted']} questions.")

    except Exception as e:
        result["messages"].append(f"❌ Error: {str(e)}")
        print(f"🔥 Exception during insertion: {e}")

    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

    return result
