import mysql.connector
from mysql.connector import Error
import os
import pandas as pd
from dotenv import load_dotenv
load_dotenv()

# --- Configurações do Banco de Dados MySQL ---
db_config = {
    'host': os.getenv('MYSQL_HOST'),
    'user': os.getenv('MYSQL_USER'),
    'password': os.getenv('MYSQL_PASSWORD'),
    'database': os.getenv('MYSQL_DATABASE'),
    'port': int(os.getenv('MYSQL_PORT', 3306))  # Adicione a porta
}

# --- Nome do arquivo CSV arrumado ---
csv_filename = 'data_trilha.csv'

# --- Nome da tabela no MySQL onde os dados serão inseridos ---
table_name = 'data'

def insert_data_from_csv():
    try:
        # 1. Carregar o CSV em um DataFrame Pandas
        df = pd.read_csv(csv_filename)
        print(f"CSV '{csv_filename}' carregado. Total de linhas: {len(df)}")
        print("Primeiras 5 linhas do DataFrame carregado:")
        print(df.head())

        # Conectar ao banco de dados MySQL
        conn = mysql.connector.connect(**db_config)
        if conn.is_connected():
            db_info = conn.get_server_info()
            print(f"Conectado ao servidor MySQL versão {db_info}")
            cursor = conn.cursor()

            # Prepare a query de inserção
            # As colunas devem corresponder às do seu CSV e da sua tabela
            columns = "timestamp, humidity, luminosity, temperature"
            insert_query = f"INSERT INTO {table_name} ({columns}) VALUES (%s, %s, %s, %s)"

            # Iterar pelo DataFrame e inserir cada linha
            print(f"\nIniciando inserção de {len(df)} linhas na tabela '{table_name}'...")
            for index, row in df.iterrows():
                # Converter o timestamp_s para datetime object (se necessário para a coluna datetime)
                # O Pandas to_datetime cria Timestamps que geralmente são compatíveis.
                # Se houver problema, pode ser necessário formatar para string:
                # datetime_str = row['datetime'].strftime('%Y-%m-%d %H:%M:%S')

                # Preparar os valores para a tupla de inserção
                values = (
                    row['timestamp'],
                    row['humidity'],
                    row['luminosity'],
                    row['temperature']
                )
                cursor.execute(insert_query, values)

                if (index + 1) % 1000 == 0: # Imprimir progresso a cada 1000 linhas
                    print(f"Inseridas {index + 1} linhas...")

            conn.commit() # Confirmar todas as alterações
            print(f"\n{len(df)} linhas inseridas com sucesso na tabela '{table_name}'.")

    except Error as e:
        print(f"Erro ao conectar ou inserir dados no MySQL: {e}")
    except FileNotFoundError:
        print(f"Erro: Arquivo '{csv_filename}' não encontrado. Certifique-se de que ele existe.")
    except KeyError as e:
        print(f"Erro: Coluna '{e}' não encontrada no CSV. Verifique os nomes das colunas.")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()
            print("Conexão MySQL fechada.")

# --- Chamar a função para executar a inserção ---
if __name__ == "__main__":
    insert_data_from_csv()