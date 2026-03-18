from flask import Flask, render_template, request, jsonify
import random

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/initialize', methods=['POST'])
def initialize_env():
    data = request.json
    n = data.get('n', 5)
    start = data.get('start')
    end = data.get('end')
    obstacles = data.get('obstacles', [])
    
    # 建立 value matrix 與 policy matrix
    value_matrix = [[0.0 for _ in range(n)] for _ in range(n)]
    policy_matrix = [['' for _ in range(n)] for _ in range(n)]
    
    directions = ['↑', '↓', '←', '→']
    
    for r in range(n):
        for c in range(n):
            pos = [r, c]
            if pos == start:
                policy_matrix[r][c] = random.choice(directions)
                value_matrix[r][c] = 0.0
            elif pos == end:
                policy_matrix[r][c] = 'G'
                value_matrix[r][c] = 0.0
            elif pos in obstacles:
                policy_matrix[r][c] = 'X'
                value_matrix[r][c] = 0.0
            else:
                policy_matrix[r][c] = random.choice(directions)
                value_matrix[r][c] = 0.0
                
    return jsonify({
        'value_matrix': value_matrix,
        'policy_matrix': policy_matrix
    })

@app.route('/api/value_iteration_full', methods=['POST'])
def value_iteration_full():
    data = request.json
    n = data.get('n', 5)
    end = data.get('end')
    obstacles = data.get('obstacles', [])
    
    gamma = 0.9
    
    def is_valid(r, c):
        return 0 <= r < n and 0 <= c < n and [r, c] not in obstacles
    
    V = [[0.0 for _ in range(n)] for _ in range(n)]
    directions = { '↑': (-1, 0), '↓': (1, 0), '←': (0, -1), '→': (0, 1) }
    
    steps = []
    
    iteration = 0
    max_iterations = 200
    while iteration < max_iterations:
        new_V = [[0.0 for _ in range(n)] for _ in range(n)]
        policy = [['' for _ in range(n)] for _ in range(n)]
        delta = 0.0
        
        for r in range(n):
            for c in range(n):
                pos = [r, c]
                if pos == end:
                    new_V[r][c] = 0.0
                    policy[r][c] = 'G'
                    continue
                if pos in obstacles:
                    new_V[r][c] = 0.0
                    policy[r][c] = 'X'
                    continue
                
                max_v = -float('inf')
                best_action = '↑'
                
                for a_name, (dr, dc) in directions.items():
                    nr, nc = r + dr, c + dc
                    if not is_valid(nr, nc):
                        nr, nc = r, c # 撞牆或撞障礙物則留在原地
                        
                    reward = 1.0 if [nr, nc] == end else 0.0
                    v = reward + gamma * V[nr][nc]
                    
                    if v > max_v:
                        max_v = v
                        best_action = a_name
                
                new_V[r][c] = max_v
                policy[r][c] = best_action
                delta = max(delta, abs(V[r][c] - new_V[r][c]))
                
        # 保存當次迭代的結果
        steps.append({
            'value_matrix': [row[:] for row in new_V],
            'policy_matrix': [row[:] for row in policy]
        })
        
        V = new_V
        if delta < 1e-4:
            break
        iteration += 1

    return jsonify({'steps': steps})

if __name__ == '__main__':
    app.run(debug=True)
