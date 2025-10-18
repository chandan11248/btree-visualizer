from flask import Flask, render_template, request, jsonify
from btree import BTree

app = Flask(__name__)

# Global B-Tree instance (in production, use session storage)
btrees = {}

def get_btree(session_id='default'):
    if session_id not in btrees:
        btrees[session_id] = BTree(t=3)  # minimum degree = 3
    return btrees[session_id]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/insert', methods=['POST'])
def insert():
    data = request.get_json()
    key = data.get('key')
    session_id = data.get('session_id', 'default')
    
    if key is None:
        return jsonify({'success': False, 'message': 'No key provided'}), 400
    
    try:
        key = int(key)
        btree = get_btree(session_id)
        
        if btree.search(key):
            return jsonify({'success': False, 'message': 'Key already exists'})
        
        btree.insert(key)
        tree_data = btree.get_tree_structure()
        
        return jsonify({
            'success': True,
            'message': f'Key {key} inserted successfully',
            'tree': tree_data
        })
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid key format'}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/delete', methods=['POST'])
def delete():
    data = request.get_json()
    key = data.get('key')
    session_id = data.get('session_id', 'default')
    
    if key is None:
        return jsonify({'success': False, 'message': 'No key provided'}), 400
    
    try:
        key = int(key)
        btree = get_btree(session_id)
        
        if not btree.search(key):
            return jsonify({'success': False, 'message': 'Key not found'})
        
        btree.delete(key)
        tree_data = btree.get_tree_structure()
        
        return jsonify({
            'success': True,
            'message': f'Key {key} deleted successfully',
            'tree': tree_data
        })
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid key format'}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/search', methods=['POST'])
def search():
    data = request.get_json()
    key = data.get('key')
    session_id = data.get('session_id', 'default')
    
    if key is None:
        return jsonify({'success': False, 'message': 'No key provided'}), 400
    
    try:
        key = int(key)
        btree = get_btree(session_id)
        found = btree.search(key)
        
        return jsonify({
            'success': True,
            'found': found,
            'message': f'Key {key} {"found" if found else "not found"}'
        })
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid key format'}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/reset', methods=['POST'])
def reset():
    data = request.get_json()
    session_id = data.get('session_id', 'default')
    
    try:
        btrees[session_id] = BTree(t=3)
        return jsonify({
            'success': True,
            'message': 'Tree reset successfully',
            'tree': {'keys': [], 'children': [], 'leaf': True}
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/tree', methods=['GET'])
def get_tree():
    session_id = request.args.get('session_id', 'default')
    
    try:
        btree = get_btree(session_id)
        tree_data = btree.get_tree_structure()
        return jsonify({
            'success': True,
            'tree': tree_data
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)