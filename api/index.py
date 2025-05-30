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
    print("Conectou")
    while True:
        raw_data = ws.receive()
        if raw_data is None:
            break

        try:
            brute_data = json.loads(raw_data) # Dados sem formato
            data = brute_data.get("data", [])
            sample_type = brute_data.get('type')
            if not sample_type:
                print("Amostra sem campo type: ", sample)
                ws.send(json.dumps({"mensagem": f"Erro: Amostra sem campo type"}))
                return
            try:
                conn = None
                cursor = None
                conn = mysql.connector.connect(**db_config)
                cursor = conn.cursor()
                # print(data)
                for sample in data:
                    timestamp = int(sample['timestamp'])

                    if sample_type != "dht":
                        cursor.execute(
                            "INSERT INTO data (sample, timestamp, type) VALUES (%s, %s, %s)",
                            (sample.get('sample'), timestamp, sample_type)
                        )
                    else:
                        cursor.execute(
                            "INSERT INTO data (sample, timestamp, type) VALUES (%s, %s, %s)",
                            (sample.get('temperature'), timestamp, "temperature")
                        )
                        cursor.execute(
                            "INSERT INTO data (sample, timestamp, type) VALUES (%s, %s, %s)",
                            (sample.get('humidity'), timestamp, "humidity")
                        )
                    conn.commit()
                # ...existing code...
                ws.send(json.dumps({"mensagem": f"Cadastrado"}))
            except mysql.connector.Error as err:
                ws.send(json.dumps({"mensagem": f"Erro: {str(err)}"}))
            finally:
                if cursor is not None:
                    cursor.close()
                if conn is not None:
                    conn.close()
        except json.JSONDecodeError:
            print("⚠️ Mensagem não é JSON válido:", raw_data)
            ws.send("Erro: formato inválido")
        except Exception as e:
            print("Ocorreu um erro ao ler o arquivo:", e)
            ws.send("Erro: formato inválido")

@sock.route('/teste')
def websocket2(ws):
    while True:
        data = ws.receive()
        brute_data = json.loads(data)
        print(brute_data.get('data')[0])
        print("ESP32:", data)
        ws.send("ACK: " + data)


@app.route('/microphone', methods=['GET'])
def get_mic():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM data WHERE type='microphone' ORDER BY timestamp ASC")
        dados = cursor.fetchall()
        return jsonify(dados)
    except mysql.connector.Error as err:
        return jsonify({'error': str(err)}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/luminosity', methods=['GET'])
def get_lum():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM data WHERE type='luminosity' ORDER BY timestamp ASC")
        dados = cursor.fetchall()
        return jsonify(dados)
    except mysql.connector.Error as err:
        return jsonify({'error': str(err)}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/humidity', methods=['GET'])
def get_hum():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM data WHERE type='humidity' ORDER BY timestamp ASC")
        dados = cursor.fetchall()
        return jsonify(dados)
    except mysql.connector.Error as err:
        return jsonify({'error': str(err)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/temperature', methods=['GET'])
def get_temp():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM data WHERE type='temperature' ORDER BY timestamp ASC")
        dados = cursor.fetchall()
        return jsonify(dados)
    except mysql.connector.Error as err:
        return jsonify({'error': str(err)}), 500
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)