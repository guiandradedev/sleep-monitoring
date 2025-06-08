from flask import Flask, request, jsonify
import mysql.connector
from dotenv import load_dotenv
import os
from flask_sock import Sock
import json
from datetime import datetime
import struct

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

# Constantes para corresponder ao ESP32
NOISE_SAMPLES_PER_PACKET = 448
I2S_SAMPLE_RATE_HZ = 8000
SAMPLE_DURATION_US = 1000000.0 / I2S_SAMPLE_RATE_HZ 

@sock.route('/ws')
def websocket(ws):
    print("Conectou")
    while True:
        print("aaa")
        raw_data = ws.receive()
        if raw_data is None:
            break

        try:
            # Tamanho do pacote esperado (int64_t para timestamp + 500 x int16_t para samples)
            expected_packet_size = 8 + (NOISE_SAMPLES_PER_PACKET * 2) # 1008 bytes
            
            if len(raw_data) != expected_packet_size:
                print(f"⚠️ Pacote inesperado (tamanho {len(raw_data)} bytes)")
                continue
            print("tamanho certo")
            # Desempacotar: 1 uint32 + 8 int16 => 'I8h'
            timestamp, *samples = struct.unpack(f'<q{NOISE_SAMPLES_PER_PACKET}h', raw_data)
            #print(f"Pacote recebido: timestamp={timestamp}, samples={samples}")

            # Inserir no banco
            try:
                conn = mysql.connector.connect(**db_config)
                cursor = conn.cursor()

                rows = [
                    (
                        int(timestamp - (NOISE_SAMPLES_PER_PACKET - 1 - i) * SAMPLE_DURATION_US), 
                        int(sample), 
                        "microphone"
                    )
                    for i, sample in enumerate(samples)
                ]
                
                # Insere todos de uma vez
                cursor.executemany("INSERT INTO data (timestamp, sample, type) VALUES (%s, %s, %s)", rows)

                conn.commit()
                #ws.send("Cadastrado")
            except mysql.connector.Error as err:
                print("❌ Erro ao inserir dados:", err)
                #ws.send(f"Erro: {str(err)}")
            finally:
                cursor.close()
                conn.close()

        except Exception as e:
            print("❌ Erro ao interpretar pacote binário:", e)
            ws.send("Erro: pacote inválido")

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