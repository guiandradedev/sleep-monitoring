import requests
import matplotlib.pyplot as plt
from datetime import datetime

# URL da API para buscar os dados
url = "http://127.0.0.1:5001/mic"

# Faz a requisição para a API
response = requests.get(url)
if response.status_code == 200:
    dados = response.json()

    # Extrai os valores de sample e timestamp
    samples = [d['sample'] for d in dados]
    # Converte os timestamps Unix (em segundos) para objetos datetime
    timestamps = [datetime.fromtimestamp(d['timestamp']) for d in dados]

    # Plota os dados
    plt.figure(figsize=(10, 6))
    plt.plot(timestamps, samples, marker='o', linestyle='-', color='b')
    plt.title("Dados do LDR")
    plt.xlabel("Timestamp")
    plt.ylabel("Sample")
    plt.grid(True)
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.show()
else:
    print(f"Erro ao buscar os dados: {response.status_code}")