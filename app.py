from flask import Flask, request, jsonify, send_from_directory
import os
import sqlite3
import base64
from datetime import datetime
import uuid

app = Flask(__name__)

# 配置
UPLOAD_FOLDER = 'uploads'
DATABASE = 'travel_records.db'

# 创建上传目录
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# 初始化数据库
def init_db():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS travel_records (
            id TEXT PRIMARY KEY,
            location TEXT NOT NULL,
            date TEXT NOT NULL,
            image_path TEXT,
            video_path TEXT,
            created_at TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

# 连接数据库
def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

# 首页路由 (静态文件服务)
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

# 年度板块路由
@app.route('/annual.html')
def annual():
    return send_from_directory('.', 'annual.html')

# 获取所有游玩记录
@app.route('/api/records', methods=['GET'])
def get_records():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM travel_records ORDER BY created_at DESC')
    records = cursor.fetchall()
    conn.close()
    
    result = []
    for record in records:
        result.append({
            'id': record['id'],
            'location': record['location'],
            'date': record['date'],
            'image': f'/uploads/{record["image_path"]}' if record['image_path'] else None,
            'video': f'/uploads/{record["video_path"]}' if record['video_path'] else None,
            'createdAt': record['created_at']
        })
    
    return jsonify(result)

# 上传游玩记录
@app.route('/api/records', methods=['POST'])
def upload_record():
    location = request.form.get('location')
    date = request.form.get('date')
    
    if not location or not date:
        return jsonify({'error': '请填写地点和时间'}), 400
    
    # 处理图片上传
    image_path = None
    if 'image' in request.files and request.files['image'].filename:
        image = request.files['image']
        filename = f'image_{uuid.uuid4()}_{image.filename}'
        image.save(os.path.join(UPLOAD_FOLDER, filename))
        image_path = filename
    
    # 处理视频上传
    video_path = None
    if 'video' in request.files and request.files['video'].filename:
        video = request.files['video']
        filename = f'video_{uuid.uuid4()}_{video.filename}'
        video.save(os.path.join(UPLOAD_FOLDER, filename))
        video_path = filename
    
    # 保存到数据库
    conn = get_db()
    cursor = conn.cursor()
    record_id = str(uuid.uuid4())
    created_at = datetime.now().isoformat()
    
    cursor.execute('''
        INSERT INTO travel_records (id, location, date, image_path, video_path, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (record_id, location, date, image_path, video_path, created_at))
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'success': True,
        'message': '记录上传成功'
    })

# 删除游玩记录
@app.route('/api/records/<record_id>', methods=['DELETE'])
def delete_record(record_id):
    conn = get_db()
    cursor = conn.cursor()
    
    # 获取记录信息
    cursor.execute('SELECT * FROM travel_records WHERE id = ?', (record_id,))
    record = cursor.fetchone()
    
    if not record:
        conn.close()
        return jsonify({'error': '记录不存在'}), 404
    
    # 删除文件
    if record['image_path']:
        image_path = os.path.join(UPLOAD_FOLDER, record['image_path'])
        if os.path.exists(image_path):
            os.remove(image_path)
    
    if record['video_path']:
        video_path = os.path.join(UPLOAD_FOLDER, record['video_path'])
        if os.path.exists(video_path):
            os.remove(video_path)
    
    # 删除数据库记录
    cursor.execute('DELETE FROM travel_records WHERE id = ?', (record_id,))
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': '记录删除成功'})

# 静态文件和上传文件服务
@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

@app.route('/uploads/<path:filename>')
def uploaded_files(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)