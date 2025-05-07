# from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer, util
import pandas as pd
import torch
# import psycopg2
import os

# app = Flask(__name__)
model = SentenceTransformer('./all-MiniLM-L6-v2')  # efficient model

def get_recommendations(courses, current_titles, top_n=4):
    df = pd.DataFrame(courses)

    # Filter only valid titles
    current_titles = [title for title in current_titles if title in df['title'].values]
    if not current_titles:
        return []

    # Encode course descriptions
    embeddings = model.encode(df['description'].tolist(), convert_to_tensor=True)

    current_indices = df[df['title'].isin(current_titles)].index.tolist()
    current_embeddings = embeddings[current_indices]
    average_embedding = torch.mean(current_embeddings, dim=0)

    # Cosine similarity
    similarity_scores = util.pytorch_cos_sim(average_embedding, embeddings)[0]

    top_results = sorted(
        list(enumerate(similarity_scores)),
        key=lambda x: x[1],
        reverse=True
    )

    recommended = []
    for i, score in top_results:
        if df.iloc[i]['title'] not in current_titles:
            recommended.append({
                'id': int(df.iloc[i]['id']),
                'title': df.iloc[i]['title']
            })
        if len(recommended) == top_n:
            break

    return recommended

# @app.route('/recommend', methods=['POST'])
# def recommend():
#     try:
#         data = request.get_json()
#         user_id = data.get('user_id')

#         if not user_id:
#             return jsonify({'error': 'user_id is required'}), 400

#         conn = psycopg2.connect(os.getenv("DATABASE_URL"))
#         cursor = conn.cursor()

#         # 🔹 Step 1: Fetch accessible courses (with IDs)
#         cursor.execute("""
#             SELECT c.id, c.title, c.description
#             FROM course_access ca
#             JOIN courses c ON ca.course_id = c.id
#             WHERE ca.user_id = %s
#         """, (user_id,))
#         accessible_courses = [{'id': cid, 'title': title, 'description': desc} for cid, title, desc in cursor.fetchall()]

#         # 🔹 Step 2: Fetch enrolled course titles
#         cursor.execute("""
#             SELECT c.title
#             FROM enrollments e
#             JOIN courses c ON e.course_id = c.id
#             WHERE e.user_id = %s
#         """, (user_id,))
#         enrolled_titles = [row[0] for row in cursor.fetchall()]

#         cursor.close()
#         conn.close()

#         if not accessible_courses or not enrolled_titles:
#             return jsonify({'recommended_courses': []})

#         recommendations = get_recommendations(accessible_courses, enrolled_titles)
#         return jsonify({'recommended_courses': recommendations})

#     except Exception as e:
#         print(f"❌ Error getting recommendations: {e}")
#         return jsonify({
#             "success": False,
#             "error": str(e)
#         }), 500

# if __name__ == '__main__':
#     app.run(debug=True, port=5001)







'''
from flask import Flask, request, jsonify
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import pandas as pd
from pprint import pprint

app = Flask(__name__)

def get_recommendations(courses, current_title, top_n=4):
    df = pd.DataFrame(courses)
    if current_title not in df['title'].values:
        return []

    vectorizer = TfidfVectorizer(stop_words='english')
    tfidf_matrix = vectorizer.fit_transform(df['description'])
    sim_matrix = cosine_similarity(tfidf_matrix)

    idx = df[df['title'] == current_title].index[0]
    sim_scores = list(enumerate(sim_matrix[idx]))
    sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)

    # skip the current course itself
    recommended = []
    for i, score in sim_scores:
        print (i, score)
        if df.iloc[i]['title'] != current_title:
            recommended.append(df.iloc[i]['title'])
        if len(recommended) == top_n:
            break

    return recommended

@app.route('/recommend', methods=['POST'])
def recommend():
    data = request.get_json()
    
    courses = data.get('courses')
    current = data.get('current_course')

    if not courses or not current:
        return jsonify({'error': 'Missing data: courses and current_course are required'}), 400

    recommendations = get_recommendations(courses, current)
    return jsonify({'recommended_courses': recommendations})

if __name__ == '__main__':
    app.run(debug=True)
'''