from flask import Flask, request, jsonify
import mysql.connector
from dotenv import load_dotenv
import os
from flask_sock import Sock
import json
from datetime import datetime

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()

app = Flask(__name__)
sock = Sock(app)

# Configuração do banco de dados MySQL usando variáveis do .env
db_config = {
    'host': os.getenv('MYSQL_HOST'),
    'user': os.getenv('MYSQL_USER'),
    'password': os.getenv('MYSQL_PASSWORD'),
    'database': os.getenv('MYSQL_DATABASE'),
    'port': int(os.getenv('MYSQL_PORT', 3306))  # Adicione a porta
}


@sock.route('/ws')
def websocket(ws):
    while True:
        raw_data = ws.receive()
        if raw_data is None:
            break

        try:
            brute_data = json.loads(raw_data) # Dados sem formato
            data = brute_data.get("data", [])
            try:
                conn = mysql.connector.connect(**db_config)
                cursor = conn.cursor()
                for sample in data:
                    # timestamp = datetime.fromtimestamp(int(sample['timestamp']) / 1000).strftime('%Y-%m-%d %H:%M:%S')
                    # cursor.execute("INSERT INTO microfone (sample, timestamp) VALUES (%s, %s)", (sample['sample'], timestamp))                    
                    # conn.commit()
                    timestamp = int(sample['timestamp']) // 1000  # Divide por 1000 para obter segundos
                    # timestamp = sample['timestamp']
                    cursor.execute("INSERT INTO microfone (sample, timestamp) VALUES (%s, %s)", (sample['sample'], timestamp))
                    conn.commit()
                ws.send(json.dumps({"mensagem": f"Cadastrado"}))
            except mysql.connector.Error as err:
                ws.send(json.dumps({"mensagem": f"Erro: {str(err)}"}))
            finally:
                cursor.close()
                conn.close()


            # # Exemplo: acessar um campo
            # nome = data.get("nome", "desconhecido")
            # print(f"Olá, {nome}!")

            # # Enviar resposta como JSON
            # ws.send(json.dumps({"mensagem": f"Olá, {nome}!"}))
        except json.JSONDecodeError:
            print("⚠️ Mensagem não é JSON válido:", raw_data)
            ws.send("Erro: formato inválido")

@sock.route('/teste')
def websocket2(ws):
    while True:
        data = ws.receive()
        brute_data = json.loads(data)
        print(brute_data.get('data')[0])
        print("ESP32:", data)
        ws.send("ACK: " + data)


@app.route('/mic', methods=['GET'])
def get_dados():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT sample, timestamp FROM microfone ORDER BY timestamp ASC")
        dados = cursor.fetchall()
        return jsonify(dados)
    except mysql.connector.Error as err:
        return jsonify({'error': str(err)}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/teste2', methods=['GET'])
def teste():
    return jsonify({"teste": "dasdas"})

# # Rota para criar um novo item
# @app.route('/items', methods=['POST'])
# def create_item():
#     # data = request.json
#     # nome = data.get('nome')
#     # quantidade = data.get('quantidade')

#     # if not nome or not quantidade:
#     #     return jsonify({'error': 'Nome e quantidade são obrigatórios!'}), 400

#     # try:
#     #     conn = mysql.connector.connect(**db_config)
#     #     cursor = conn.cursor()
#     #     cursor.execute("INSERT INTO items (nome, quantidade) VALUES (%s, %s)", (nome, quantidade))
#     #     conn.commit()
#     #     return jsonify({'message': 'Item criado com sucesso!'}), 201
#     # except mysql.connector.Error as err:
#     #     return jsonify({'error': str(err)}), 500
#     # finally:
#     #     cursor.close()
#     #     conn.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)